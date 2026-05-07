import ai_edge_litert.interpreter as tflite
interpreter = tflite.Interpreter(model_path="models/model.tflite")
interpreter.allocate_tensors()
for i, detail in enumerate(interpreter.get_output_details()):
    print(f"Output {i}: {detail['name']} - Shape: {detail['shape']}")