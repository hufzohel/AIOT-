#ifndef CONFIG_H
#define CONFIG_H

/**
 * @brief Network Configuration for AIoT Smart Home
 */

// Centralized Backend URL
// Replace with your Laptop's Local IP (cmd -> ipconfig)
#define SERVER_URL "http://192.168.1.5:8000/api/sensors/update"

// Connection Timeouts
#define HTTP_TIMEOUT_MS 10000

#endif // CONFIG_H
