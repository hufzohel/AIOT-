#ifndef HTTP_CLIENT_H
#define HTTP_CLIENT_H

#include "esp_err.h"

esp_err_t http_post_sensor_data(float temp, float hum);

#endif // HTTP_CLIENT_H
