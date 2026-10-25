/* Настройки сайта — меняйте только значения в кавычках.
   SUPPORT_FORM_URL — ссылка на опубликованную Google Форму (вида https://docs.google.com/forms/d/e/…/viewform).
   SUPPORT_FORM_FIELDS — номера полей формы (entry.XXXXXXXX): как их найти — Форма → ⋮ → «Получить ссылку для предварительного заполнения».
   Если поля заполнены, на сайте показывается красивая форма в стиле сайта; если нет — встроенная Google Форма. */
window.APP_CONFIG = {
  SUPPORT_FORM_URL: 'https://docs.google.com/forms/d/e/1FAIpQLSesHjSLKFXEIBxUXoyzW2pd3NZ2oX1doFFXlNVjWUnVC4iHig/viewform?usp=header',
  SUPPORT_FORM_FIELDS: {
    subject: 'entry.502119941',   // поле «Тема»
    message: 'entry.106114660',   // поле «Сообщение»
    email:   'entry.745186397'    // поле «Email для ответа»
  }
};
