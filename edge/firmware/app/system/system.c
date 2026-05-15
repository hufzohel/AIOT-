#include "system.h"
#include "data_collector.h"
#include "heartbeat.h"
#include "dht11.h"
#include "wifi_manager.h"
#include "http_server.h"
#include "esp_log.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

#define DHT11_PIN GPIO_NUM_4
#define WIFI_SSID "Bakito Coffee L1"
#define WIFI_PSW "chucngonmieng"
static const char *TAG = "SYSTEM";

void system_start(void) {
    ESP_LOGI(TAG, "Initializing Smart Home System...");

    // Initialize the DHT11 Sensor directly
    if (dht11_init(DHT11_PIN) != ESP_OK) {
        ESP_LOGE(TAG, "Failed to initialize DHT11 sensor.");
    }

    // Initialize Connectivity
    esp_log_level_set("wifi", ESP_LOG_WARN); // Silence Wi-Fi chatter
    if (wifi_init_sta(WIFI_SSID, WIFI_PSW) != ESP_OK) {
        ESP_LOGE(TAG, "Failed to initialize Wi-Fi.");
    }

    // Start Web Server immediately (Accessible via AP mode if STA is disconnected)
    ESP_LOGI(TAG, "Starting Command/Config Server...");
    http_server_start();

    // Start App Services
    heartbeat_start();    // Monitor system health
    data_collector_start(); // Monitor environmental data

    ESP_LOGI(TAG, "System initialization complete.");
}
