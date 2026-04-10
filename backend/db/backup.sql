--
-- PostgreSQL database dump
--

-- Dumped from database version 15.4 (Debian 15.4-2.pgdg120+1)
-- Dumped by pg_dump version 15.4 (Debian 15.4-2.pgdg120+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: vector; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;


--
-- Name: EXTENSION vector; Type: COMMENT; Schema: -; Owner:
--

COMMENT ON EXTENSION vector IS 'vector data type and ivfflat and hnsw access methods';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
-- Matches data_seed.json: id, email, password, name, role (MEMBER/ADMIN), permissions (jsonb), faceAuth (jsonb)
--

CREATE TABLE public.users (
    id integer NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    name text NOT NULL,
    role text NOT NULL DEFAULT 'MEMBER',
    permissions jsonb NOT NULL DEFAULT '{"deviceTypes": [], "deviceIds": []}',
    face_auth jsonb NOT NULL DEFAULT '{"enabled": false, "sampleCount": 0, "registeredAt": null, "updatedAt": null, "threshold": 0.42, "embedding": []}',
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.users_id_seq OWNER TO postgres;

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: devices; Type: TABLE; Schema: public; Owner: postgres
-- Matches data_seed.json: id, name, type, room, online, power, value
-- No user_id FK — access is controlled by user.permissions (deviceTypes / deviceIds)
--

CREATE TABLE public.devices (
    id integer NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    room text NOT NULL,
    online boolean NOT NULL DEFAULT true,
    power boolean NOT NULL DEFAULT false,
    value integer NOT NULL DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.devices OWNER TO postgres;

--
-- Name: devices_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.devices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.devices_id_seq OWNER TO postgres;

ALTER SEQUENCE public.devices_id_seq OWNED BY public.devices.id;


--
-- Name: sensor_data; Type: TABLE; Schema: public; Owner: postgres
-- Matches data_seed.json sensors: keyed by user_id, each row has time, temperature, humidity, light
--

CREATE TABLE public.sensor_data (
    id integer NOT NULL,
    user_id integer NOT NULL,
    time text NOT NULL,
    temperature double precision,
    humidity double precision,
    light double precision,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.sensor_data OWNER TO postgres;

--
-- Name: sensor_data_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sensor_data_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.sensor_data_id_seq OWNER TO postgres;

ALTER SEQUENCE public.sensor_data_id_seq OWNED BY public.sensor_data.id;


--
-- Name: system_logs; Type: TABLE; Schema: public; Owner: postgres
-- Matches data_seed.json systemLogs: id, timestamp, user (name string), action, level
--

CREATE TABLE public.system_logs (
    id integer NOT NULL,
    "user" text NOT NULL,
    action text NOT NULL,
    level text NOT NULL DEFAULT 'info',
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.system_logs OWNER TO postgres;

--
-- Name: system_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.system_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.system_logs_id_seq OWNER TO postgres;

ALTER SEQUENCE public.system_logs_id_seq OWNED BY public.system_logs.id;


--
-- Name: face_profiles; Type: TABLE; Schema: public; Owner: postgres
-- Stores face embeddings separately for pgvector similarity search
-- Mirrors user.faceAuth in data_seed.json
--

CREATE TABLE public.face_profiles (
    id integer NOT NULL,
    user_id integer NOT NULL,
    enabled boolean NOT NULL DEFAULT false,
    sample_count integer NOT NULL DEFAULT 0,
    threshold double precision NOT NULL DEFAULT 0.42,
    embedding public.vector(512),
    registered_at timestamp without time zone,
    updated_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.face_profiles OWNER TO postgres;

--
-- Name: face_profiles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.face_profiles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.face_profiles_id_seq OWNER TO postgres;

ALTER SEQUENCE public.face_profiles_id_seq OWNED BY public.face_profiles.id;


--
-- Set default values for id columns
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);
ALTER TABLE ONLY public.devices ALTER COLUMN id SET DEFAULT nextval('public.devices_id_seq'::regclass);
ALTER TABLE ONLY public.sensor_data ALTER COLUMN id SET DEFAULT nextval('public.sensor_data_id_seq'::regclass);
ALTER TABLE ONLY public.system_logs ALTER COLUMN id SET DEFAULT nextval('public.system_logs_id_seq'::regclass);
ALTER TABLE ONLY public.face_profiles ALTER COLUMN id SET DEFAULT nextval('public.face_profiles_id_seq'::regclass);


-- ============================================================
-- DATA
-- ============================================================

--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
-- Matches data_seed.json users (role: MEMBER/ADMIN, permissions, faceAuth)
--

COPY public.users (id, email, password, name, role, permissions, face_auth, created_at) FROM stdin;
1	member1@smarthome.com	password123	Nguyễn Văn A	MEMBER	{"deviceTypes": ["light", "fan"], "deviceIds": [6]}	{"enabled": false, "sampleCount": 0, "registeredAt": null, "updatedAt": null, "threshold": 0.42, "embedding": []}	2026-04-08 18:14:11.389115
2	admin@smarthome.com	admin123	Trần Thị B	ADMIN	{"deviceTypes": [], "deviceIds": []}	{"enabled": false, "sampleCount": 0, "registeredAt": null, "updatedAt": null, "threshold": 0.42, "embedding": []}	2026-04-08 18:14:11.389115
3	member2@smarthome.com	password456	Lê Minh C	MEMBER	{"deviceTypes": ["ac"], "deviceIds": [2, 9]}	{"enabled": false, "sampleCount": 0, "registeredAt": null, "updatedAt": null, "threshold": 0.42, "embedding": []}	2026-04-08 18:14:11.389115
\.


--
-- Data for Name: devices; Type: TABLE DATA; Schema: public; Owner: postgres
-- Matches data_seed.json devices (room, online, power, value — no user_id)
--

COPY public.devices (id, name, type, room, online, power, value, created_at) FROM stdin;
1	Đèn phòng khách	light	Phòng khách	true	true	80	2026-04-08 18:14:37.586206
2	Đèn phòng ngủ	light	Phòng ngủ	true	false	0	2026-04-08 18:14:37.586206
3	Đèn nhà bếp	light	Nhà bếp	true	true	100	2026-04-08 18:14:37.586206
4	Quạt phòng khách	fan	Phòng khách	true	true	3	2026-04-08 18:14:37.586206
5	Quạt phòng ngủ	fan	Phòng ngủ	false	false	0	2026-04-08 18:14:37.586206
6	Điều hòa phòng khách	ac	Phòng khách	true	true	24	2026-04-08 18:14:37.586206
7	Điều hòa phòng ngủ	ac	Phòng ngủ	true	false	0	2026-04-08 18:14:37.586206
8	Đèn ban công	light	Ban công	false	false	0	2026-04-08 18:14:37.586206
9	Điều hòa phòng làm việc	ac	Phòng làm việc	true	true	23	2026-04-08 18:14:37.586206
10	Quạt phòng làm việc	fan	Phòng làm việc	true	false	0	2026-04-08 18:14:37.586206
\.


--
-- Data for Name: sensor_data; Type: TABLE DATA; Schema: public; Owner: postgres
-- Matches data_seed.json sensors keyed by userId, with temperature + humidity + light per time slot
--

COPY public.sensor_data (id, user_id, time, temperature, humidity, light, created_at) FROM stdin;
1	1	06:00	25.1	74	120	2026-04-08 18:15:27.758385
2	1	09:00	28.4	66	560	2026-04-08 18:15:27.758385
3	1	12:00	31.2	57	780	2026-04-08 18:15:27.758385
4	1	15:00	30.0	60	630	2026-04-08 18:15:27.758385
5	1	18:00	28.1	65	280	2026-04-08 18:15:27.758385
6	1	21:00	26.4	70	90	2026-04-08 18:15:27.758385
7	3	06:00	24.7	76	110	2026-04-08 18:15:27.758385
8	3	09:00	27.6	68	520	2026-04-08 18:15:27.758385
9	3	12:00	30.4	60	760	2026-04-08 18:15:27.758385
10	3	15:00	29.3	62	610	2026-04-08 18:15:27.758385
11	3	18:00	27.4	67	260	2026-04-08 18:15:27.758385
12	3	21:00	25.9	72	80	2026-04-08 18:15:27.758385
\.


--
-- Data for Name: system_logs; Type: TABLE DATA; Schema: public; Owner: postgres
-- Matches data_seed.json systemLogs: user is a name string, level instead of status
--

COPY public.system_logs (id, "user", action, level, created_at) FROM stdin;
1	Trần Thị B	Đăng nhập bằng mật khẩu	info	2026-03-27 08:30:00
2	Nguyễn Văn A	Bật Đèn phòng khách	info	2026-03-27 08:20:00
3	Lê Minh C	Bật Điều hòa phòng làm việc	success	2026-03-27 08:15:00
\.


--
-- Data for Name: face_profiles; Type: TABLE DATA; Schema: public; Owner: postgres
-- No face profiles registered yet (all users have faceAuth.enabled = false)
--

COPY public.face_profiles (id, user_id, enabled, sample_count, threshold, embedding, registered_at, updated_at, created_at) FROM stdin;
\.


--
-- Sequence resets
--

SELECT pg_catalog.setval('public.users_id_seq', 3, true);
SELECT pg_catalog.setval('public.devices_id_seq', 10, true);
SELECT pg_catalog.setval('public.sensor_data_id_seq', 12, true);
SELECT pg_catalog.setval('public.system_logs_id_seq', 3, true);
SELECT pg_catalog.setval('public.face_profiles_id_seq', 1, false);


-- ============================================================
-- CONSTRAINTS
-- ============================================================

--
-- Primary keys
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT devices_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.sensor_data
    ADD CONSTRAINT sensor_data_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.system_logs
    ADD CONSTRAINT system_logs_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.face_profiles
    ADD CONSTRAINT face_profiles_pkey PRIMARY KEY (id);


--
-- Unique constraints
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);

ALTER TABLE ONLY public.face_profiles
    ADD CONSTRAINT face_profiles_user_id_key UNIQUE (user_id);


--
-- Foreign keys
--

ALTER TABLE ONLY public.sensor_data
    ADD CONSTRAINT sensor_data_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);

ALTER TABLE ONLY public.face_profiles
    ADD CONSTRAINT face_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Indexes for performance
--

CREATE INDEX idx_sensor_data_user_id ON public.sensor_data (user_id);
CREATE INDEX idx_system_logs_created_at ON public.system_logs (created_at DESC);
CREATE INDEX idx_devices_type ON public.devices (type);


--
-- PostgreSQL database dump complete
--
