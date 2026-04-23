#include "heartbeat.h"
#include "driver/gpio.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "esp_log.h"
#include "esp_timer.h"
#include "esp_system.h"

#define HEARTBEAT_LED GPIO_NUM_2
static const char *TAG = "HEARTBEAT";

static void heartbeat_task(void *pvParameters) {
    ESP_LOGI(TAG, "Heartbeat monitoring started.");
    
    // Initialize the LED pin
    gpio_reset_pin(HEARTBEAT_LED);
    gpio_set_direction(HEARTBEAT_LED, GPIO_MODE_OUTPUT);
    bool led_state = false;

    while (1) {
        // Toggle LED state
        led_state = !led_state;
        gpio_set_level(HEARTBEAT_LED, led_state);

        // Get system health stats
        uint32_t uptime_s = (uint32_t)(esp_timer_get_time() / 1000000);
        uint32_t free_heap = esp_get_free_heap_size();
        
        // Log the heartbeat with uptime and memory usage
        ESP_LOGI(TAG, "[BEAT] Uptime: %u s | Free Heap: %u bytes", 
                 uptime_s, free_heap);

        // Wait 1 second
        vTaskDelay(pdMS_TO_TICKS(1000));
    }
}

void heartbeat_start(void) {
    xTaskCreate(heartbeat_task, "heartbeat", 4096, NULL, 1, NULL);
}
