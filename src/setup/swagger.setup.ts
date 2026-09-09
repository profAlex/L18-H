import {INestApplication} from '@nestjs/common';
import {DocumentBuilder, SwaggerModule} from '@nestjs/swagger';
import {GLOBAL_PREFIX} from './global-prefix.setup';

export function swaggerSetup(app: INestApplication) {
    const config = new DocumentBuilder()
        .setTitle('BLOGGER API')
        .setDescription('The BLOGGER API description')
        .addBearerAuth()
        .setVersion('1.0')
        .addTag('blogger')
        .build();

    const document = SwaggerModule.createDocument(app, config);

    // добавляем кнопочку по сворачиванию/разворачиванию всех объектов на странице сваггера
    const customJsCode = `
    (function() {
      const interval = setInterval(() => {
        const container = document.querySelector('.swagger-ui .information-container');
        if (container && !document.querySelector('.toggle-all')) {
          const btnContainer = document.createElement('div');
          btnContainer.className = 'custom-btn-container';
          const btn = document.createElement('button');
          btn.className = 'btn toggle-all';
          btn.innerText = 'Expand All';
          let isExpanded = false;
          
          btn.onclick = () => {
            isExpanded = !isExpanded;
            const sections = document.querySelectorAll('.opblock-tag-section');
            sections.forEach(section => {
              const isCurrentlyExpanded = section.classList.contains('is-open');
              if ((isExpanded && !isCurrentlyExpanded) || (!isExpanded && isCurrentlyExpanded)) {
                const clickTarget = section.querySelector('.expand-operation, .opblock-tag');
                if (clickTarget) clickTarget.click();
              }
            });
            btn.innerText = isExpanded ? 'Collapse All' : 'Expand All';
          };
          
          btnContainer.appendChild(btn);
          container.after(btnContainer);
          // Останавливаем поиск, когда кнопка успешно добавлена
          clearInterval(interval);
        }
      }, 100);
    })();
  `;

    SwaggerModule.setup(GLOBAL_PREFIX, app, document, {
        customSiteTitle: 'Blogger Swagger',
        swaggerOptions: {
            // 'list' - развернуты только теги (рекомендуется)
            // 'none' - всё скрыто (максимально компактно)
            // 'full' - всё развернуто (по умолчанию)
            docExpansion: 'none',

            // Дополнительно: сохранять состояние фильтра или другие настройки
            filter: true, // Добавляет строку поиска/фильтрации эндпоинтов
        },
        customJsStr: customJsCode, // твоя переменная с JS-кодом
        customCss: `
    .custom-btn-container { 
      padding: 10px 20px; 
      display: flex; 
      justify-content: flex-end; 
    }
    .toggle-all { 
      background: #4990e2; 
      color: white; 
      border: none; 
      padding: 8px 15px; 
      cursor: pointer; 
      border-radius: 4px;
      font-weight: bold;
    }
    .toggle-all:hover {
      background: #357abd;
    }
  `,

  });
}
