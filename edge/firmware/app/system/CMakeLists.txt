idf_component_register(SRCS "system.c"
                    INCLUDE_DIRS "."
                    PRIV_REQUIRES heartbeat data_collector dht11 wifi_manager)
