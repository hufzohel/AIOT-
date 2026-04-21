idf_component_register(SRCS "dht11.c"
                    INCLUDE_DIRS "."
                    REQUIRES esp_driver_gpio hal esp_rom esp_timer)
