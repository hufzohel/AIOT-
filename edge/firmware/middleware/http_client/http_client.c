#include "http_client.h"
#include "esp_http_client.h"
#include "esp_log.h"

#define SERVER_URL "http://192.168.1.200:5000/api/sensors/update" 

esp_err_t http_post_sensor_data(float temp, float hum) {
    char post_data[128];
    snprintf(post_data, sizeof(post_data), "{\"temperature\": %.1f, \"humidity\": %.1f}", temp, hum);

    esp_http_client_config_t config = {
        .url = SERVER_URL,
        .method = HTTP_METHOD_POST,
        .timeout_ms = 10000,
    };
    esp_http_client_handle_t client = esp_http_client_init(&config);
    esp_http_client_set_header(client, "Content-Type", "application/json");
    esp_http_client_set_post_field(client, post_data, strlen(post_data));

    esp_err_t err = esp_http_client_perform(client);
    if (err == ESP_OK) {
        ESP_LOGI("HTTP", "Data sent successfully");
    } else {
        ESP_LOGE("HTTP", "HTTP POST failed: %s", esp_err_to_name(err));
    }

    esp_http_client_cleanup(client);
    return err;
}
