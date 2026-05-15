#include "http_server.h"
#include "esp_http_server.h"
#include "esp_log.h"
#include "cJSON.h"
#include "fan.h"

static const char *TAG = "HTTP_SERVER";
static httpd_handle_t server = NULL;

/* Handler for POST /control */
static esp_err_t control_post_handler(httpd_req_t *req) {
    char buf[128];
    int ret, remaining = req->content_len;

    if (remaining >= sizeof(buf)) {
        httpd_resp_send_err(req, HTTPD_500_INTERNAL_SERVER_ERROR, "Payload too large");
        return ESP_FAIL;
    }

    ret = httpd_req_recv(req, buf, remaining);
    if (ret <= 0) return ESP_FAIL;
    buf[ret] = '\0';

    ESP_LOGI(TAG, "Received Command: %s", buf);

    cJSON *json = cJSON_Parse(buf);
    if (json == NULL) return ESP_FAIL;

    cJSON *power = cJSON_GetObjectItem(json, "power");
    cJSON *value = cJSON_GetObjectItem(json, "value");

    if (cJSON_IsBool(power)) {
        bool state = cJSON_IsTrue(power);
        fan_set_power(state);
        ESP_LOGI(TAG, "Fan Power set to: %s", state ? "ON" : "OFF");
        
        // If turning on, set default speed or provided speed
        if (state && cJSON_IsNumber(value)) {
            fan_set_speed(value->valueint);
        }
    } else if (cJSON_IsNumber(value)) {
        // If only speed is updated, only apply if fan is on
        fan_set_speed(value->valueint);
    }

    cJSON_Delete(json);
    httpd_resp_sendstr(req, "{\"status\":\"ok\"}");
    return ESP_OK;
}

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

    fan_init();

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
