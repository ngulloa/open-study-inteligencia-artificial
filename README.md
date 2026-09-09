# Inteligencia Artificial I — OpenStudy

Sitio académico autónomo desarrollado con Quarto. Cubre el alcance actualmente disponible: fundamentos de aprendizaje de máquina, representación de datos, generalización, árboles de decisión, máquinas de vectores de soporte y fundamentos de aprendizaje por refuerzo.

## Requisitos y uso local

Se requiere [Quarto CLI](https://quarto.org/) instalado.

```bash
quarto preview
```

Para generar el sitio completo:

```bash
quarto render
```

El render se escribe en `docs/`. Esta carpeta forma parte del repositorio y permite publicar mediante GitHub Pages seleccionando `docs/` como origen.

## Estructura

- `fundamentos/`: IA, aprendizaje inductivo y componentes de un sistema de ML.
- `datos/`: representación, generalización y selección de modelos.
- `supervisado/`: árboles de decisión y familia SVM.
- `refuerzo/`: agentes, MDP, retorno y políticas.
- `references.bib`: bibliografía académica de apoyo.
- `theme.scss` y `styles/`: identidad visual, componentes y comportamiento responsivo.

## Criterios editoriales

El contenido se organiza por conceptos, no por clases. Las páginas son autocontenidas, conservan la terminología técnica en español e inglés cuando resulta útil y enlazan definiciones relacionadas para evitar repeticiones.

Usa `$...$` para matemática inline y `$$` para bloques. Antes de publicar, ejecuta `quarto render`, comprueba enlaces y citas, y confirma que `docs/` corresponde a las fuentes actuales.
