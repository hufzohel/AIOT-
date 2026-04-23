cmake_minimum_required(VERSION 3.16)

# Set the component search paths
list(APPEND EXTRA_COMPONENT_DIRS 
    "${CMAKE_CURRENT_LIST_DIR}/app/system"
    "${CMAKE_CURRENT_LIST_DIR}/app/heartbeat"
    "${CMAKE_CURRENT_LIST_DIR}/app/data_collector"
    "${CMAKE_CURRENT_LIST_DIR}/driver/dht11"
    "${CMAKE_CURRENT_LIST_DIR}/middleware/http_client" 
    "${CMAKE_CURRENT_LIST_DIR}/middleware/wifi_manager"
    "${CMAKE_CURRENT_LIST_DIR}/src")

include($ENV{IDF_PATH}/tools/cmake/project.cmake)
project(firmware)
