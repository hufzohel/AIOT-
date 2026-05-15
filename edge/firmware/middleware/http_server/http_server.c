#include "http_server.h"
#include "esp_http_server.h"
#include "esp_log.h"
#include "cJSON.h"
#include "driver/gpio.h"
#include "driver/ledc.h"

static const char *TAG = "HTTP_SERVER";
static httpd_handle_t server = NULL;

#define FAN_GPIO_PIN GPIO_NUM_18
#define LEDC_TIMER    LEDC_TIMER_0
#define LEDC_MODE     LEDC_LOW_SPEED_MODE
#define LEDC_CHANNEL  LEDC_CHANNEL_0
#define LEDC_DUTY_RES LEDC_TIMER_10_BIT // 1024 steps
#define LEDC_FREQ     5000 // 5kHz

static void init_fan_pwm(void) {
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
}

/* Handler for POST /control */
static esp_err_t control_post_handler(httpd_req_t *req) {
    char buf[128];
    int ret, remaining = req->content_len;

    if (remaining >= sizeof(buf)) {
        httpd_resp_send_err(req, HTTPD_500_INTERNAL_SERVER_ERROR, "Payload too large");
        return ESP_FAIL;
    }

    ret = httpd_req_recv(req, buf, remaining);
    if (ret <= 0) {
        return ESP_FAIL;
    }
    buf[ret] = '\0';

    ESP_LOGI(TAG, "Received Command: %s", buf);

    cJSON *json = cJSON_Parse(buf);
    if (json == NULL) {
        httpd_resp_send_err(req, HTTPD_400_BAD_REQUEST, "Invalid JSON");
        return ESP_FAIL;
    }

    cJSON *power = cJSON_GetObjectItem(json, "power");
    cJSON *value = cJSON_GetObjectItem(json, "value");

    if (cJSON_IsBool(power)) {
        bool state = cJSON_IsTrue(power);
        if (!state) {
            ledc_set_duty(LEDC_MODE, LEDC_CHANNEL, 0);
        } else {
            // Restore speed 1 if power is ON but value wasn't provided
            ledc_set_duty(LEDC_MODE, LEDC_CHANNEL, 341); 
        }
        ledc_update_duty(LEDC_MODE, LEDC_CHANNEL);
        ESP_LOGI(TAG, "Fan Power set to: %s", state ? "ON" : "OFF");
    }

    if (cJSON_IsNumber(value)) {
        int speed = value->valueint; // Assumed 1, 2, or 3
        uint32_t duty = 0;
        if (speed == 1) duty = 341;
        else if (speed == 2) duty = 682;
        else if (speed == 3) duty = 1023;
        
        ledc_set_duty(LEDC_MODE, LEDC_CHANNEL, duty);
        ledc_update_duty(LEDC_MODE, LEDC_CHANNEL);
        ESP_LOGI(TAG, "Fan Speed set to: %d (Duty: %lu)", speed, duty);
    }

    cJSON_Delete(json);
    httpd_resp_sendstr(req, "{\"status\":\"ok\"}");
    return ESP_OK;
}
// ... rest of the file ...

static const httpd_uri_t control_uri = {
    .uri       = "/control",
    .method    = HTTP_POST,
    .handler   = control_post_handler,
    .user_ctx  = NULL
};

/* Handler for GET /config - serves a simple HTML form */
static esp_err_t config_get_handler(httpd_req_t *req) {
    const char *resp = "<html><body>"
                       "<h2>Device Config</h2>"
                       "<form action='/config' method='POST'>"
                       "SSID: <input type='text' name='ssid'><br>"
                       "Pass: <input type='password' name='pass'><br>"
                       "Backend URL: <input type='text' name='url'><br>"
                       "<input type='submit' value='Save & Restart'>"
                       "</form></body></html>";
    httpd_resp_send(req, resp, HTTPD_RESP_USE_STRLEN);
    return ESP_OK;
}

/* Handler for POST /config - receives form data */
static esp_err_t config_post_handler(httpd_req_t *req) {
    char buf[256];
    int ret = httpd_req_recv(req, buf, sizeof(buf) - 1);
    if (ret > 0) {
        buf[ret] = '\0';
        ESP_LOGI(TAG, "Config Received: %s", buf);
        // TODO: Save to NVS and restart device
    }
    httpd_resp_sendstr(req, "Config saved. Restarting...");
    return ESP_OK;
}

static const httpd_uri_t config_get_uri = {
    .uri       = "/config",
    .method    = HTTP_GET,
    .handler   = config_get_handler,
    .user_ctx  = NULL
};

static const httpd_uri_t config_post_uri = {
    .uri       = "/config",
    .method    = HTTP_POST,
    .handler   = config_post_handler,
    .user_ctx  = NULL
};

esp_err_t http_server_start(void) {
    httpd_config_t config = HTTPD_DEFAULT_CONFIG();
    config.stack_size = 8192;

    // Initialize PWM for Fan
    init_fan_pwm();

    ESP_LOGI(TAG, "Starting server on port: '%d'", config.server_port);
    if (httpd_start(&server, &config) == ESP_OK) {
        httpd_register_uri_handler(server, &control_uri);
        httpd_register_uri_handler(server, &config_get_uri);
        httpd_register_uri_handler(server, &config_post_uri);
        ESP_LOGI(TAG, "Web server started on port %d", config.server_port);
        return ESP_OK;
    }

    ESP_LOGE(TAG, "Error starting server!");
    return ESP_FAIL;
}

void http_server_stop(void) {
    if (server) {
        httpd_stop(server);
        server = NULL;
    }
}
