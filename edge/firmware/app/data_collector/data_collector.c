#include "data_collector.h"
#include "dht11.h"
#include "wifi_manager.h"
#include "http_client.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "esp_log.h"

static const char *TAG = "DATA_COLLECTOR";

static void data_collector_task(void *pvParameters) {
    dht11_data_t data;
    ESP_LOGI(TAG, "Sensor collection task started.");

    while (1) {
        // 1. Report Status
        if (wifi_is_connected()) {
            ESP_LOGI(TAG, "[WIFI]: Connected");
        } else {
            ESP_LOGI(TAG, "[WIFI]: Connecting...");
        }

        // 2. Read Sensors
        esp_err_t err = dht11_read(&data);
        if (err == ESP_OK) {
            ESP_LOGI(TAG, "Temp: %.1f°C | Hum: %.1f%%", data.temperature, data.humidity);
            
            // 3. Send to backend
            if (wifi_is_connected()) {
                http_post_sensor_data(data.temperature, data.humidity);
            }
        } else {
            ESP_LOGW(TAG, "Sensor read error: %s", esp_err_to_name(err));
        }
        
        // Wait 5 minutes
        vTaskDelay(pdMS_TO_TICKS(300000));
    }
}

void data_collector_start(void) {
    xTaskCreate(data_collector_task, "data_collector", 4096, NULL, 5, NULL);
}
