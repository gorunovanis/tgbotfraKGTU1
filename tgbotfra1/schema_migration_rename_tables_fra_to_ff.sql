-- Переименование таблиц *_fra → ff_* (если база создана старым schema_mysql.sql).
-- Выполните один раз. Дубликаты имён — значит переименование уже сделано.

SET FOREIGN_KEY_CHECKS = 0;

RENAME TABLE `ff_ai_messages_fra` TO `ff_ai_messages`;
RENAME TABLE `ff_coach_clients_fra` TO `ff_coach_clients`;
RENAME TABLE `ff_workout_plans_fra` TO `ff_workout_plans`;
RENAME TABLE `ff_workouts_fra` TO `ff_workouts`;
RENAME TABLE `ff_meals_fra` TO `ff_meals`;
RENAME TABLE `ff_water_fra` TO `ff_water`;
RENAME TABLE `ff_steps_fra` TO `ff_steps`;
RENAME TABLE `ff_weight_fra` TO `ff_weight`;
RENAME TABLE `ff_measurements_fra` TO `ff_measurements`;
RENAME TABLE `ff_exercises_fra` TO `ff_exercises`;
RENAME TABLE `ff_users_fra` TO `ff_users`;

SET FOREIGN_KEY_CHECKS = 1;
