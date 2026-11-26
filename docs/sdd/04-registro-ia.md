# Registro de uso de IA y decisiones

**Fecha de generación:** 23/11/2026. **Herramienta:** ChatGPT (GPT-6). **Solicitud fuente:** `Texto pegado(4).txt`, prompt maestro proporcionado por usuario.

**Solicitud real:** construir desde cero la plataforma Saber 11 en Django, React, PostgreSQL y pandas, con IA Ollama, análisis PDF, documentación SDD y PowerPoint. Se conserva el documento original como referencia de requisitos en el chat, no se inventan solicitudes históricas.

**Archivos generados:** código y documentación presentes en este repositorio. **Comprobaciones ejecutadas:** `python -m compileall` sobre `backend` → sintaxis correcta. Prueba directa del parser CSV sintético y XLSX de ocho hojas sintéticas → extracción de 2 instituciones y 5 componentes cada una. **Comprobaciones NO ejecutadas:** servidor Django, migraciones, conexión PostgreSQL, npm build, carga de archivo ICFES, Ollama y pruebas de interfaz. **Razón:** dependencias Django no instaladas por falta de acceso a red del entorno de generación.

**Decisión:** implementar base de trabajo integrada y señalar claramente qué funcionalidades son parciales. El prompt original contempla un alcance mayor que este primer incremento. En cada sprint futuro debe actualizarse este registro con prompt real, cambios hechos, archivos y pruebas observadas.
