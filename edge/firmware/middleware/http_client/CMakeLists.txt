idf_component_register(SRCS "http_client.c"
                    INCLUDE_DIRS "."
                    PRIV_REQUIRES esp_http_client wifi_manager)
