idf_component_register(SRCS "heartbeat.c"
                    INCLUDE_DIRS "."
                    PRIV_REQUIRES esp_timer esp_driver_gpio)
