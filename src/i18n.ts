import { deleteMessages, extraMessages } from "./i18n-extra";

export type Language = "es" | "en" | "de" | "zh" | "ja" | "pt" | "it" | "fr";

const messages = {
  es: {
    stickers: "Stickers", settings: "Opciones", addSticker: "Añadir sticker", adding: "Añadiendo…",
    collection: "en tu colección", show: "Mostrar", hide: "Ocultar", editMode: "Editar", finishEditing: "Terminar edición",
    version: "Versión", credits: "Créditos", interCredit: "fuente de la interfaz, bajo la licencia", emojiPickerCredit: "selector de emojis de las colecciones", data: "Datos", dataHint: "Archivos importados y ajustes guardados en este equipo", openDataFolder: "Abrir carpeta de datos", loading: "Cargando stickers…",
    emptyTitle: "Tu colección está vacía", emptyDescription: "Pulsa «Añadir sticker» o arrastra un archivo aquí para empezar.",
    couldNotAdd: "No se pudo añadir el sticker", showSticker: "Mostrar sticker", hideSticker: "Ocultar sticker", editSticker: "Editar sticker",
    onTop: "Siempre encima", notOnTop: "Sticker normal", onTopHint: "Mantener encima de otras aplicaciones",
    language: "Idioma", languageHint: "Idioma de la interfaz y del menú de la bandeja", general: "General",
    startup: "Inicio", startupHint: "Abre Wallies al iniciar sesión en Windows.",
    startWithWindows: "Iniciar con Windows", startUnsupported: "Disponible por ahora solo en Windows",
    errorSaving: "No se pudo guardar el ajuste",
    closeWithoutSaving: "Cerrar sin guardar", cropDrag: "RECORTE · ARRASTRA LAS ESQUINAS", result: "RESULTADO", resetCrop: "Restablecer recorte",
    removeBackground: "Quitar fondo", removeBackgroundHint: "Elige el color que se hará transparente", color: "Color", tolerance: "Tolerancia",
    gifSpeed: "Velocidad del GIF", rotation: "Rotación", resetRotation: "Restablecer giro", flipHorizontal: "Voltear horizontalmente", flipVertical: "Voltear verticalmente", opacity: "Opacidad", clickThrough: "Ignorar clics", clickThroughHint: "Los clics pasan a la ventana de detrás",
    lockPosition: "Bloquear posición", deleteSticker: "Eliminar sticker", cancel: "Cancelar", saveChanges: "Guardar cambios", saving: "Guardando…",
    loadingSticker: "Cargando sticker…", confirmDelete: "¿Eliminar este sticker de Wallies?", desktopLabel: "TU ESCRITORIO, A TU GUSTO",
    minimize: "Minimizar", maximize: "Maximizar/restaurar", hideToTray: "Ocultar en la bandeja", resizeSticker: "Cambiar tamaño", rotateStickerDesktop: "Arrastra para girar",
    addSource: "Añadir sticker", fromComputer: "Archivo local", fromUrl: "Enlace directo", searchGifs: "Buscar GIFs",
    chooseFile: "Seleccionar imagen o GIF", urlHint: "Pega un enlace directo a un GIF, PNG, JPG o WEBP (https://)",
    urlPlaceholder: "https://ejemplo.com/sticker.gif", importUrl: "Importar enlace", searchPlaceholder: "Busca gatos, estrellas, corazones…",
    searchAction: "Buscar", noResults: "No hay GIFs para esta búsqueda", searching: "Buscando…", searchTimeout: "La búsqueda tardó demasiado. Prueba otra vez o elige una fuente concreta.", importingGif: "Descargando…",
    gifCitiesCredit: "GIFs de GifCities · Internet Archive", gifSource: "Fuente de GIFs", allSources: "Todos", gifCities: "GifCities", wikimediaCommons: "Commons", back: "Volver", onlineError: "No se pudo completar la operación",
    stickerName: "Nombre", maintainAspectRatio: "Mantener proporción", maintainAspectHint: "Desactívalo para estirar el sticker libremente",
    editorImage: "Imagen y animación", editorTransform: "Forma y orientación", editorWindow: "En el escritorio",
    pixelated: "Píxeles nítidos", pixelatedHint: "Sin suavizado al ampliar; ideal para pixel art",
    createCollection: "Crear colección", editCollection: "Editar colección", collectionName: "Nombre de la colección", collectionEmoji: "Icono de la colección", collectionLabel: "Colección", noCollection: "Sin colección",
    collectionOn: "Activada", collectionOff: "Desactivada", deleteCollection: "Eliminar colección", confirmDeleteCollection: "Elige qué hacer con los stickers. Si los eliminas, no podrás recuperarlos.", deleteCollectionQuestion: "¿Qué quieres eliminar?", deleteCollectionOnly: "Solo colección", deleteCollectionWithStickers: "Colección y stickers",
    dropToAdd: "Suelta aquí archivos, imágenes o enlaces para añadirlos", addToCollection: "Añadir a esta colección",
    unsupportedDrop: "Suelta una imagen, un GIF o un enlace HTTPS válido",
    expandCollection: "Abrir colección", collapseCollection: "Cerrar colección", stickerSingular: "sticker", dropHere: "Suelta aquí para sacar de una colección",
  },
  en: {
    stickers: "Stickers", settings: "Settings", addSticker: "Add sticker", adding: "Adding…",
    collection: "in your collection", show: "Show", hide: "Hide", editMode: "Edit mode", finishEditing: "Finish editing",
    version: "Version", credits: "Credits", interCredit: "interface font, licensed under the", emojiPickerCredit: "collection emoji picker", data: "Data", dataHint: "Imported files and settings stored on this device", openDataFolder: "Open data folder", loading: "Loading stickers…",
    emptyTitle: "Your collection is empty", emptyDescription: "Click “Add sticker” or drag a file here to get started.",
    couldNotAdd: "Could not add sticker", showSticker: "Show sticker", hideSticker: "Hide sticker", editSticker: "Edit sticker",
    onTop: "Always on top", notOnTop: "Normal sticker", onTopHint: "Keep above other applications",
    language: "Language", languageHint: "Language of the interface and tray menu", general: "General",
    startup: "Startup", startupHint: "Open Wallies when you sign in to Windows.",
    startWithWindows: "Start with Windows", startUnsupported: "Currently available on Windows only",
    errorSaving: "Could not save setting",
    closeWithoutSaving: "Close without saving", cropDrag: "CROP · DRAG THE CORNERS", result: "RESULT", resetCrop: "Reset crop",
    removeBackground: "Remove background", removeBackgroundHint: "Pick a color to make transparent", color: "Color", tolerance: "Tolerance",
    gifSpeed: "GIF speed", rotation: "Rotation", resetRotation: "Reset rotation", flipHorizontal: "Flip horizontally", flipVertical: "Flip vertically", opacity: "Opacity", clickThrough: "Click-through", clickThroughHint: "Mouse clicks pass to the window behind",
    lockPosition: "Lock position", deleteSticker: "Delete sticker", cancel: "Cancel", saveChanges: "Save changes", saving: "Saving…",
    loadingSticker: "Loading sticker…", confirmDelete: "Delete this sticker from Wallies?", desktopLabel: "YOUR DESKTOP, YOUR WAY",
    minimize: "Minimize", maximize: "Maximize/restore", hideToTray: "Hide to tray", resizeSticker: "Resize", rotateStickerDesktop: "Drag to rotate",
    addSource: "Add sticker", fromComputer: "Local file", fromUrl: "Direct link", searchGifs: "Search GIFs",
    chooseFile: "Choose image or GIF", urlHint: "Paste a direct link to a GIF, PNG, JPG or WEBP (https://)",
    urlPlaceholder: "https://example.com/sticker.gif", importUrl: "Import link", searchPlaceholder: "Search cats, stars, hearts…",
    searchAction: "Search", noResults: "No GIFs found for this search", searching: "Searching…", searchTimeout: "Search took too long. Try again or choose one source.", importingGif: "Downloading…",
    gifCitiesCredit: "GIFs from GifCities · Internet Archive", gifSource: "GIF source", allSources: "All", gifCities: "GifCities", wikimediaCommons: "Commons", back: "Back", onlineError: "Could not complete the operation",
    stickerName: "Name", maintainAspectRatio: "Keep aspect ratio", maintainAspectHint: "Turn off to stretch the sticker freely",
    editorImage: "Image and animation", editorTransform: "Shape and orientation", editorWindow: "On the desktop",
    pixelated: "Crisp pixels", pixelatedHint: "No smoothing when enlarged; ideal for pixel art",
    createCollection: "Create collection", editCollection: "Edit collection", collectionName: "Collection name", collectionEmoji: "Collection icon", collectionLabel: "Collection", noCollection: "No collection",
    collectionOn: "Enabled", collectionOff: "Disabled", deleteCollection: "Delete collection", confirmDeleteCollection: "Choose what to do with the stickers. Deleting them cannot be undone.", deleteCollectionQuestion: "What would you like to delete?", deleteCollectionOnly: "Collection only", deleteCollectionWithStickers: "Collection and stickers",
    dropToAdd: "Drop files, images or links here to add them", addToCollection: "Add to this collection",
    unsupportedDrop: "Drop an image, GIF or valid HTTPS link",
    expandCollection: "Open collection", collapseCollection: "Close collection", stickerSingular: "sticker", dropHere: "Drop here to remove from a collection",
  },
} as const;

export type TranslationKey = keyof typeof messages.es;
const shortStartupHints: Partial<Record<Language, string>> = {
  de: "Wallies bei der Windows-Anmeldung starten.",
  fr: "Ouvrir Wallies au démarrage de Windows.",
  it: "Avvia Wallies all'accesso a Windows.",
  pt: "Abrir Wallies ao iniciar sessão no Windows.",
  zh: "登录 Windows 时启动 Wallies。",
  ja: "Windows へのサインイン時に Wallies を起動します。",
};
const shortEmptyDescriptions: Partial<Record<Language, string>> = {
  de: "Klicke auf „Sticker hinzufügen“ oder ziehe eine Datei hierher.",
  fr: "Cliquez sur « Ajouter un sticker » ou glissez un fichier ici.",
  it: "Premi «Aggiungi sticker» o trascina qui un file.",
  pt: "Clica em «Adicionar sticker» ou arrasta um ficheiro para aqui.",
  zh: "点击“添加贴纸”或将文件拖到这里即可开始。",
  ja: "「ステッカーを追加」を押すか、ファイルをここにドラッグしてください。",
};
export function tr(language: Language, key: TranslationKey): string {
  if (key === "startupHint" && shortStartupHints[language]) return shortStartupHints[language];
  if (key === "emptyDescription" && shortEmptyDescriptions[language]) return shortEmptyDescriptions[language];
  if (language === "es" || language === "en") return messages[language][key];
  return deleteMessages[language]?.[key] ?? extraMessages[language]?.[key] ?? messages.en[key];
}
