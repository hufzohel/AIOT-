#include "dht11.h"
#include "driver/gpio.h"
#include "esp32/rom/ets_sys.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "esp_timer.h"
#include "esp_log.h"

static gpio_num_t dht_gpio;
static int64_t last_read_time = -2000000;
static dht11_data_t last_read_data = {-1.0f, -1.0f};

#define DHT11_TIMEOUT -1

// ─────────────────────────────────────────────
// Private helpers
// ─────────────────────────────────────────────

/**
 * @brief Wait for a specific level or timeout.
 * Returns the number of microseconds waited, or DHT11_TIMEOUT.
 */
static int _waitOrTimeout(uint16_t microSeconds, int level) {
    int micros_ticks = 0;
    while(gpio_get_level(dht_gpio) == level) { 
        if(micros_ticks++ > microSeconds) 
            return DHT11_TIMEOUT;
        ets_delay_us(1);
    }
    return micros_ticks;
}

static void _sendStartSignal() {
    // Pull low for 20ms
    gpio_set_level(dht_gpio, 0);
    ets_delay_us(20 * 1000); 
    
    // Release the line (let pull-up pull it high)
    gpio_set_level(dht_gpio, 1);
    ets_delay_us(40);
}

static esp_err_t _checkResponse() {
    // Sensor should pull low (initially high)
    if(_waitOrTimeout(200, 1) == DHT11_TIMEOUT) return ESP_ERR_TIMEOUT;

    // Sensor pulls low for ~80us
    if(_waitOrTimeout(200, 0) == DHT11_TIMEOUT) return ESP_ERR_TIMEOUT;

    // Sensor pulls high for ~80us
    if(_waitOrTimeout(200, 1) == DHT11_TIMEOUT) return ESP_ERR_TIMEOUT; 
    return ESP_OK;
}

// ─────────────────────────────────────────────
// Global function definitions
// ─────────────────────────────────────────────

esp_err_t dht11_init(gpio_num_t pin) {
    dht_gpio = pin;
    gpio_config_t io_conf = {
        .pin_bit_mask = (1ULL << dht_gpio),
        .mode = GPIO_MODE_INPUT_OUTPUT_OD,
        .pull_up_en = GPIO_PULLUP_ENABLE,
        .pull_down_en = GPIO_PULLDOWN_DISABLE,
        .intr_type = GPIO_INTR_DISABLE,
    };
    
    esp_err_t err = gpio_config(&io_conf);
    if (err != ESP_OK) return err;

    // Initial stabilization delay
    vTaskDelay(pdMS_TO_TICKS(1000));
    
    // Hold high
    gpio_set_level(dht_gpio, 1);
    
    return ESP_OK;
}

esp_err_t dht11_read(dht11_data_t *data) {
    /* Rate limiting: DHT11 needs ~2 seconds between readings */
    if(esp_timer_get_time() - last_read_time < 2000000) {
        data->temperature = last_read_data.temperature;
        data->humidity = last_read_data.humidity;
        return (last_read_data.temperature == -1.0f) ? ESP_ERR_INVALID_STATE : ESP_OK;
    }

    last_read_time = esp_timer_get_time();
    uint8_t bytes[5] = {0};

    _sendStartSignal();

    if(_checkResponse() != ESP_OK) {
        return ESP_ERR_TIMEOUT;
    }
    
    /* Read 40 bits */
    for(int i = 0; i < 40; i++) {
        // Wait for bit start (LOW pulse ~50us)
        if(_waitOrTimeout(200, 0) == DHT11_TIMEOUT) return ESP_ERR_TIMEOUT;
                
        // Measure HIGH pulse duration
        int high_duration = _waitOrTimeout(200, 1);
        if(high_duration == DHT11_TIMEOUT) return ESP_ERR_TIMEOUT;

        // If high pulse > 40us, bit is 1 (0 is ~28us, 1 is ~70us)
        if(high_duration > 40) {
            bytes[i/8] |= (1 << (7-(i%8)));
        }
    }

    // Checksum verification
    if(bytes[4] != ((bytes[0] + bytes[1] + bytes[2] + bytes[3]) & 0xFF)) {
        return ESP_ERR_INVALID_CRC;
    }

    // Incorporate decimals (integer + fractional)
    last_read_data.humidity = (float)bytes[0] + (float)bytes[1] * 0.1f;
    last_read_data.temperature = (float)bytes[2] + (float)bytes[3] * 0.1f;
    
    data->humidity = last_read_data.humidity;
    data->temperature = last_read_data.temperature;

    return ESP_OK;
}
