idf_component_register(SRCS "data_collector.c"
                    INCLUDE_DIRS "."
                    PRIV_REQUIRES dht11 wifi_manager http_client)
