/**
 * Gives Android's time picker dialog the same Airmail dialog theme as the date
 * picker. `@react-native-community/datetimepicker`'s plugin styles the clock
 * widget (`android:timePickerStyle`) but not the dialog around it, so its
 * Cancel/OK buttons fell back to Material teal and, in dark mode, its header
 * digits took the DayNight inverse text colour (navy on blue). It reuses the
 * resources that plugin writes: the `datePicker_*` colours (light and night,
 * including both `*Inverse` entries) and the `TimePickerTheme` style. Android
 * resolves them at build time, so plugin order doesn't matter, but removing
 * the `timePicker` block or the inverse colours from app.config.ts breaks the
 * resource build ("resource not found"). The date dialog's buttons take
 * `textColorPrimary` (ink / near-white), so this dialog's accent uses it too;
 * checked side by side on the emulator in both themes.
 */
const { AndroidConfig, withAndroidStyles } = require('expo/config-plugins');

const { assignStylesValue, getAppThemeGroup } = AndroidConfig.Styles;

const STYLE = { name: 'TimePickerDialogTheme', parent: 'Theme.AppCompat.Light.Dialog' };

const ITEMS = {
  // Button text: ink in light, near-white in dark, as on the date dialog.
  colorAccent: '@color/datePicker_textColorPrimary',
  colorControlActivated: '@color/datePicker_colorControlActivated',
  'android:windowBackground': '@color/datePicker_windowBackground',
  'android:textColor': '@color/datePicker_textColor',
  'android:textColorPrimary': '@color/datePicker_textColorPrimary',
  'android:textColorSecondary': '@color/datePicker_textColorSecondary',
  'android:textColorPrimaryInverse': '@color/datePicker_textColorPrimaryInverse',
  'android:textColorSecondaryInverse': '@color/datePicker_textColorSecondaryInverse',
  // The dialog theme sits over the app theme; keep the clock's own style.
  'android:timePickerStyle': '@style/TimePickerTheme',
};

module.exports = function withTimePickerDialogTheme(config) {
  return withAndroidStyles(config, (mod) => {
    let styles = mod.modResults;
    for (const [name, value] of Object.entries(ITEMS)) {
      styles = assignStylesValue(styles, { add: true, parent: STYLE, name, value });
    }
    mod.modResults = assignStylesValue(styles, {
      add: true,
      parent: getAppThemeGroup(),
      name: 'android:timePickerDialogTheme',
      value: `@style/${STYLE.name}`,
    });
    return mod;
  });
};
