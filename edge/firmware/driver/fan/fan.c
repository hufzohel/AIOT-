#include "fan.h"
#include "driver/ledc.h"
#include "driver/gpio.h"
#include "esp_log.h"

static const char *TAG = "FAN_DRIVER";

#define FAN_GPIO_PIN GPIO_NUM_18
#define LEDC_TIMER    LEDC_TIMER_0
#define LEDC_MODE     LEDC_LOW_SPEED_MODE
#define LEDC_CHANNEL  LEDC_CHANNEL_0
#define LEDC_DUTY_RES LEDC_TIMER_10_BIT
#define LEDC_FREQ     5000 

void fan_init(void) {
    ledc_timer_config_t ledc_timer = {
        .speed_mode       = LEDC_MODE,
        .timer_num        = LEDC_TIMER,
        .duty_resolution  = LEDC_DUTY_RES,
        .freq_hz          = LEDC_FREQ,
        .clk_cfg          = LEDC_AUTO_CLK
    };
    ledc_timer_config(&ledc_timer);

    ledc_channel_config_t ledc_channel = {
        .speed_mode     = LEDC_MODE,
        .channel        = LEDC_CHANNEL,
        .timer_sel      = LEDC_TIMER,
        .gpio_num       = FAN_GPIO_PIN,
        .duty           = 0,
        .hpoint         = 0
    };
    ledc_channel_config(&ledc_channel);
    ESP_LOGI(TAG, "Fan PWM initialized on GPIO %d", FAN_GPIO_PIN);
}

void fan_set_speed(int speed) {
    uint32_t duty = 0;
    if (speed == 1) duty = 341;
    else if (speed == 2) duty = 682;
    else if (speed == 3) duty = 1023;
    
    ledc_set_duty(LEDC_MODE, LEDC_CHANNEL, duty);
    ledc_update_duty(LEDC_MODE, LEDC_CHANNEL);
    ESP_LOGI(TAG, "Fan speed set to %d (Duty %lu)", speed, duty);
}

void fan_set_power(bool power) {
    if (power) {
        fan_set_speed(1); // Default to speed 1
    } else {
        ledc_set_duty(LEDC_MODE, LEDC_CHANNEL, 0);
        ledc_update_duty(LEDC_MODE, LEDC_CHANNEL);
        ESP_LOGI(TAG, "Fan powered OFF");
    }
}
