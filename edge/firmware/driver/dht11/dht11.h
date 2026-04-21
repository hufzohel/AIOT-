#ifndef DHT11_H
#define DHT11_H

#include "hal/gpio_types.h"
#include "esp_err.h"

typedef struct {
    float temperature;
    float humidity;
} dht11_data_t;

esp_err_t dht11_init(gpio_num_t pin);
esp_err_t dht11_read(dht11_data_t *data);

#endif // DHT11_H
