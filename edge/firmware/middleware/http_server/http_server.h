#ifndef HTTP_SERVER_H
#define HTTP_SERVER_H

#include "esp_err.h"

/**
 * @brief Initialize and start the lightweight HTTP server on the ESP32.
 * 
 * This server listens for incoming "Push" commands from the FastAPI backend.
 * 
 * @return esp_err_t ESP_OK on success
 */
esp_err_t http_server_start(void);

/**
 * @brief Stop the HTTP server.
 */
void http_server_stop(void);

#endif // HTTP_SERVER_H
