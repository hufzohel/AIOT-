#ifndef FAN_H
#define FAN_H

#include <stdbool.h>

void fan_init(void);
void fan_set_speed(int speed); // 0 (OFF), 1, 2, 3
void fan_set_power(bool power);

#endif
