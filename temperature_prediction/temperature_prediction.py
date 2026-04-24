import argparse
import csv
import math
from datetime import datetime, timedelta
from pathlib import Path

def load_csv(path):
	"""Load CSV rows into (datetime, temperature, humidity) tuples.
	Input: path (str) to .CSV with 'YYYY/MM/DD HH:MM:SS,temp,hum' format, one per line and no header.
	Output: list of (datetime, float, float), skipping invalid rows.
	"""
	samples = []
	with open(path, "r", encoding="utf-8") as f:
		reader = csv.reader(f)
		for row in reader:
			if len(row) < 3:
				continue
			try:
				dt = datetime.strptime(row[0].strip(), "%Y/%m/%d %H:%M:%S")
				temp = float(row[1])
				hum = float(row[2])
			except ValueError:
				continue
			samples.append((dt, temp, hum))
	return samples


def build_features(window):
	"""Build a numeric feature vector from a lookback window.
	Input: window list[(datetime, temp, hum)].
	Output: list[float] feature vector for regression.
	"""
	temps = [t for _, t, _ in window]
	hums = [h for _, _, h in window]
	last_dt = window[-1][0]
	last_temp = temps[-1]
	last_hum = hums[-1]

	mean_temp = sum(temps) / len(temps)
	mean_hum = sum(hums) / len(hums)
	min_temp = min(temps)
	max_temp = max(temps)
	min_hum = min(hums)
	max_hum = max(hums)

	temp_trend = temps[-1] - temps[0]
	hum_trend = hums[-1] - hums[0]

	minutes = last_dt.hour * 60 + last_dt.minute
	day_frac = minutes / (24 * 60)
	sin_day = math.sin(2 * math.pi * day_frac)
	cos_day = math.cos(2 * math.pi * day_frac)

	return [
		1.0,
		last_temp,
		last_hum,
		mean_temp,
		mean_hum,
		min_temp,
		max_temp,
		min_hum,
		max_hum,
		temp_trend,
		hum_trend,
		sin_day,
		cos_day,
	]


def transpose(matrix):
	"""Transpose a 2D list.
	Input: matrix list[list[float]].
	Output: transposed list[list[float]].
	"""
	return [list(row) for row in zip(*matrix)]


def matmul(a, b):
	"""Matrix multiply two 2D lists.
	Input: a (m x k), b (k x n).
	Output: product matrix (m x n).
	"""
	rows = len(a)
	cols = len(b[0])
	mid = len(b)
	out = [[0.0 for _ in range(cols)] for _ in range(rows)]
	for i in range(rows):
		for k in range(mid):
			aik = a[i][k]
			if aik == 0:
				continue
			for j in range(cols):
				out[i][j] += aik * b[k][j]
	return out


def matvec(a, v):
	"""Multiply matrix by vector.
	Input: a (m x n), v (n).
	Output: vector (m).
	"""
	return [sum(a[i][j] * v[j] for j in range(len(v))) for i in range(len(a))]


def invert(matrix):
	"""Invert a square matrix with Gauss-Jordan elimination.
	Input: matrix list[list[float]] (n x n).
	Output: inverse matrix or None if singular.
	"""
	n = len(matrix)
	aug = [row[:] + [1.0 if i == j else 0.0 for j in range(n)] for i, row in enumerate(matrix)]

	for i in range(n):
		pivot = i
		for r in range(i + 1, n):
			if abs(aug[r][i]) > abs(aug[pivot][i]):
				pivot = r
		if abs(aug[pivot][i]) < 1e-12:
			return None
		if pivot != i:
			aug[i], aug[pivot] = aug[pivot], aug[i]

		pivot_val = aug[i][i]
		for j in range(2 * n):
			aug[i][j] /= pivot_val

		for r in range(n):
			if r == i:
				continue
			factor = aug[r][i]
			if factor == 0:
				continue
			for j in range(2 * n):
				aug[r][j] -= factor * aug[i][j]

	return [row[n:] for row in aug]


def fit_linear_regression(X, y, ridge=1e-3):
	"""Fit ridge-regularized linear regression weights.
	Input: X (samples x features), y (samples), ridge (float).
	Output: weight vector or None if matrix is singular.
	"""
	xt = transpose(X)
	xtx = matmul(xt, X)
	for i in range(len(xtx)):
		xtx[i][i] += ridge
	xty = matvec(xt, y)
	inv = invert(xtx)
	if inv is None:
		return None
	return matvec(inv, xty)


def train_models(samples, lookback_steps=288, horizon_steps=72):
	"""Train per-horizon linear models for temperature and humidity.
	Input: samples list[(datetime, temp, hum)].
	Output: (temp_models, hum_models) lists or None if not enough data.
	"""
	if len(samples) < lookback_steps + horizon_steps:
		return None

	X = []
	temp_targets = [[] for _ in range(horizon_steps)]
	hum_targets = [[] for _ in range(horizon_steps)]

	for i in range(lookback_steps - 1, len(samples) - horizon_steps):
		window = samples[i - lookback_steps + 1 : i + 1]
		features = build_features(window)
		X.append(features)
		for h in range(1, horizon_steps + 1):
			temp_targets[h - 1].append(samples[i + h][1])
			hum_targets[h - 1].append(samples[i + h][2])

	temp_models = []
	hum_models = []

	for h in range(horizon_steps):
		temp_models.append(fit_linear_regression(X, temp_targets[h]))
		hum_models.append(fit_linear_regression(X, hum_targets[h]))

	return temp_models, hum_models


def predict_next_6_hours(samples, temp_models, hum_models, lookback_steps=288):
	"""Predict the next 6 hours at 5-minute steps.
	Input: samples list[(datetime, temp, hum)] and trained models.
	Output: list[(datetime, temp_pred, hum_pred)].
	"""
	window = samples[-lookback_steps:]
	features = build_features(window)
	start_time = samples[-1][0]
	predictions = []

	for idx in range(len(temp_models)):
		temp_model = temp_models[idx]
		hum_model = hum_models[idx]
		if temp_model is None or hum_model is None:
			continue
		pred_temp = sum(w * x for w, x in zip(temp_model, features))
		pred_hum = sum(w * x for w, x in zip(hum_model, features))
		pred_time = start_time + timedelta(minutes=5 * (idx + 1))
		predictions.append((pred_time, pred_temp, pred_hum))

	return predictions


def main():
	"""Load CSV, train models, and print 6-hour predictions."""
	parser = argparse.ArgumentParser()
	parser.add_argument(
		"--csv",
		default=str(
			Path(__file__).resolve().parents[1] / "backend" / "sample_temperature_humidity.csv"
		),
		help="Path to CSV with datetime, temperature, humidity",
	)
	args = parser.parse_args()

	samples = load_csv(args.csv)
	if not samples:
		print("No valid samples found.")
		return

	models = train_models(samples)
	if models is None:
		print("Not enough data to train (need at least 24h + 6h).")
		return

	temp_models, hum_models = models
	predictions = predict_next_6_hours(samples, temp_models, hum_models)

	for dt, temp, hum in predictions:
		print(f"{dt:%Y/%m/%d %H:%M:%S}, {temp:.2f}, {hum:.2f}")


if __name__ == "__main__":
	main()
