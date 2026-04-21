#include "system.h"
#include "data_collector.h"
#include "heartbeat.h"
#include "dht11.h"
#include "wifi_manager.h"
#include "esp_log.h"

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
    // Note: Use your actual SSID and Password here
    if (wifi_init_sta(WIFI_SSID, WIFI_PSW) != ESP_OK) {
        ESP_LOGE(TAG, "Failed to initialize Wi-Fi.");
    }

    // Start App Services
    heartbeat_start();    // Monitor system health
    data_collector_start(); // Monitor environmental data

    ESP_LOGI(TAG, "System initialization complete.");
}
