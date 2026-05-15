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

        // Wait 1 second
        vTaskDelay(pdMS_TO_TICKS(1000));
    }
}

void heartbeat_start(void) {
    xTaskCreate(heartbeat_task, "heartbeat", 4096, NULL, 1, NULL);
}
