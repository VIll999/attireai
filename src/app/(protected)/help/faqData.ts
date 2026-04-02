export interface FAQItem {
  category: string;
  question: string;
  answer: string;
}

export const FAQ_DATA_EN: FAQItem[] = [
  {
    category: "Getting Started",
    question: "How do I create my first outfit recommendation?",
    answer: "Start by creating a measurement profile with your body measurements. Then complete the style quiz to help us understand your preferences. Finally, go to the Recommendations page and click 'Generate Outfits' to get personalized suggestions based on your profile."
  },
  {
    category: "Getting Started",
    question: "Do I need to complete all profile sections?",
    answer: "While not mandatory, completing your measurements, color analysis, and style preferences will significantly improve the accuracy of your recommendations. The more information you provide, the better we can personalize your outfits."
  },
  {
    category: "Getting Started",
    question: "What is the style quiz?",
    answer: "The style quiz is a 6-question assessment that helps us understand your fashion preferences, lifestyle, and budget. Your answers help us recommend styles that match your personality and needs. Your top 3 style preferences will be saved automatically."
  },
  {
    category: "Measurements",
    question: "How do I add my body measurements?",
    answer: "Go to the Measurements page and click 'Add Measurements'. You can manually input your measurements or use our camera-based measurement tool for more accurate results. We support both CM/kg and IN/lbs units."
  },
  {
    category: "Measurements",
    question: "Can I have multiple measurement profiles?",
    answer: "Yes! You can create multiple profiles (e.g., for different body shapes or for family members). Mark one as 'Primary' to use it as your default for recommendations."
  },
  {
    category: "Measurements",
    question: "How accurate are the size recommendations?",
    answer: "Our size recommendations are based on your measurements and brand-specific sizing charts. While we strive for accuracy, we recommend checking the specific item's size guide as sizing can vary between brands and styles."
  },
  {
    category: "Color Analysis",
    question: "What is color analysis?",
    answer: "Color analysis determines which colors complement your natural coloring (skin tone, hair color, and eye color). We use professional color theory and the 12-season system to recommend colors that make you look your best."
  },
  {
    category: "Color Analysis",
    question: "How do I use the color analysis feature?",
    answer: "Navigate to the Color Analysis page, upload a clear photo of your face in natural lighting, and manually select your skin tone and hair color. Our algorithm will analyze your coloring and provide a personalized color palette."
  },
  {
    category: "Color Analysis",
    question: "Can I update my color profile?",
    answer: "Yes! Your color analysis can be updated anytime from the Color Analysis page. This is useful if your hair color changes or if you want to refine your results."
  },
  {
    category: "Recommendations",
    question: "How do AI recommendations work?",
    answer: "Our AI analyzes your measurements, color profile, style preferences, and the occasion you're dressing for. It then searches for real products from retailers that match your criteria and assembles complete outfits tailored to you."
  },
  {
    category: "Recommendations",
    question: "Can I customize the occasion or weather?",
    answer: "Yes! When generating recommendations, you can specify the occasion (casual, business, formal, etc.), weather conditions, dress code, and budget to get the most relevant outfit suggestions."
  },
  {
    category: "Recommendations",
    question: "How do I save an outfit?",
    answer: "On the Recommendations page, click the heart icon on any outfit to save it to your Saved Outfits collection. You can access your saved outfits anytime from the Saved Outfits page in the navigation menu."
  },
  {
    category: "Recommendations",
    question: "What does 'Price Drop' mean?",
    answer: "When an item in your saved outfit has a lower price than when you originally saved it, we'll show a 'Price Drop' badge with the discount percentage. This helps you find the best deals on items you love."
  },
  {
    category: "Account & Privacy",
    question: "How do I update my profile information?",
    answer: "Go to the Profile page from the navigation menu. You can update your name, profile picture, and other account details. Click 'Save' to apply your changes."
  },
  {
    category: "Account & Privacy",
    question: "How do I delete my account?",
    answer: "Go to your Profile page and scroll to the 'Danger Zone' section. Click 'Delete Account', type 'DELETE' to confirm, and your account and all associated data will be permanently removed. This action cannot be undone."
  },
  {
    category: "Account & Privacy",
    question: "Is my data secure?",
    answer: "Yes! We use industry-standard encryption to protect your data. Your measurements and photos are stored securely and are never shared with third parties without your consent."
  },
  {
    category: "Troubleshooting",
    question: "Why aren't I getting recommendations?",
    answer: "Make sure you have completed at least your measurement profile. If you still don't see recommendations, try refreshing the page or checking your internet connection. Contact support if the issue persists."
  }
];

export const FAQ_DATA_ZH: FAQItem[] = [
  {
    category: "入门指南",
    question: "如何创建我的第一个穿搭推荐？",
    answer: "首先，创建一个包含您身体数据的测量档案。然后完成风格测试，帮助我们了解您的偏好。最后，前往推荐页面，点击'生成穿搭'，即可根据您的资料获得个性化建议。"
  },
  {
    category: "入门指南",
    question: "我需要完成所有档案部分吗？",
    answer: "虽然不是强制性的，但完成您的身体数据、色彩分析和风格偏好将显著提高推荐的准确性。您提供的信息越多，我们就能越好地为您定制穿搭。"
  },
  {
    category: "入门指南",
    question: "什么是风格测试？",
    answer: "风格测试是一个6题评估，帮助我们了解您的时尚偏好、生活方式和预算。您的答案将帮助我们推荐符合您个性和需求的风格。您的前3个风格偏好将自动保存。"
  },
  {
    category: "身体数据",
    question: "如何添加我的身体数据？",
    answer: "前往'身体数据'页面，点击'添加测量数据'。您可以手动输入测量数据，或使用我们基于相机的测量工具以获得更准确的结果。我们支持厘米/公斤和英寸/磅两种单位。"
  },
  {
    category: "身体数据",
    question: "我可以有多个测量档案吗？",
    answer: "可以！您可以创建多个档案（例如，用于不同的体型或家庭成员）。将其中一个标记为'主要'档案，作为推荐的默认档案。"
  },
  {
    category: "身体数据",
    question: "尺码推荐有多准确？",
    answer: "我们的尺码推荐基于您的测量数据和品牌特定的尺码表。虽然我们力求准确，但建议您查看具体商品的尺码指南，因为尺码可能因品牌和款式而异。"
  },
  {
    category: "色彩分析",
    question: "什么是色彩分析？",
    answer: "色彩分析确定哪些颜色能衬托您的自然肤色（肤色、发色和眼色）。我们使用专业色彩理论和12季色彩系统，推荐让您看起来最棒的颜色。"
  },
  {
    category: "色彩分析",
    question: "如何使用色彩分析功能？",
    answer: "进入色彩分析页面，在自然光下上传一张清晰的面部照片，然后手动选择您的肤色和发色。我们的算法将分析您的肤色并提供个性化的色彩搭配。"
  },
  {
    category: "色彩分析",
    question: "我可以更新我的色彩档案吗？",
    answer: "可以！您可以随时从色彩分析页面更新您的色彩分析。如果您的发色改变或想要完善结果，这会很有用。"
  },
  {
    category: "推荐",
    question: "AI推荐是如何工作的？",
    answer: "我们的AI会分析您的身体数据、色彩档案、风格偏好以及您要穿着的场合。然后，它会从零售商那里搜索符合您标准的真实商品，并为您组装完整的穿搭。"
  },
  {
    category: "推荐",
    question: "我可以自定义场合或天气吗？",
    answer: "可以！在生成推荐时，您可以指定场合（休闲、商务、正式等）、天气条件、着装要求和预算，以获得最相关的穿搭建议。"
  },
  {
    category: "推荐",
    question: "如何保存穿搭？",
    answer: "在推荐页面，点击任何穿搭上的心形图标即可将其保存到您的已保存穿搭集合中。您可以随时从导航菜单中的'已保存穿搭'页面访问您保存的穿搭。"
  },
  {
    category: "推荐",
    question: "'降价'是什么意思？",
    answer: "当您保存的穿搭中的商品价格低于您最初保存时的价格时，我们会显示带有折扣百分比的'降价'徽章。这可以帮助您在喜欢的商品上找到最优惠的价格。"
  },
  {
    category: "账户与隐私",
    question: "如何更新我的个人资料信息？",
    answer: "从导航菜单进入个人资料页面。您可以更新您的姓名、头像和其他账户详细信息。点击'保存'以应用您的更改。"
  },
  {
    category: "账户与隐私",
    question: "如何删除我的账户？",
    answer: "前往您的个人资料页面并滚动到'危险区域'部分。点击'删除账户'，输入'DELETE'进行确认，您的账户和所有相关数据将被永久删除。此操作无法撤销。"
  },
  {
    category: "账户与隐私",
    question: "我的数据安全吗？",
    answer: "是的！我们使用行业标准加密来保护您的数据。您的测量数据和照片都会被安全存储，未经您的同意，我们绝不会与第三方共享。"
  },
  {
    category: "故障排除",
    question: "为什么我没有收到推荐？",
    answer: "确保您至少完成了测量档案。如果仍然看不到推荐，请尝试刷新页面或检查您的互联网连接。如果问题仍然存在，请联系支持团队。"
  }
];

export const FAQ_DATA_ES: FAQItem[] = [
  {
    category: "Primeros Pasos",
    question: "¿Cómo creo mi primera recomendación de outfit?",
    answer: "Comienza creando un perfil de medidas con tus medidas corporales. Luego completa el test de estilo para ayudarnos a entender tus preferencias. Finalmente, ve a la página de Recomendaciones y haz clic en 'Generar Outfits' para obtener sugerencias personalizadas basadas en tu perfil."
  },
  {
    category: "Primeros Pasos",
    question: "¿Necesito completar todas las secciones del perfil?",
    answer: "Aunque no es obligatorio, completar tus medidas, análisis de color y preferencias de estilo mejorará significativamente la precisión de tus recomendaciones. Cuanta más información proporciones, mejor podremos personalizar tus outfits."
  },
  {
    category: "Primeros Pasos",
    question: "¿Qué es el test de estilo?",
    answer: "El test de estilo es una evaluación de 6 preguntas que nos ayuda a entender tus preferencias de moda, estilo de vida y presupuesto. Tus respuestas nos ayudan a recomendar estilos que coincidan con tu personalidad y necesidades. Tus 3 preferencias de estilo principales se guardarán automáticamente."
  },
  {
    category: "Medidas",
    question: "¿Cómo añado mis medidas corporales?",
    answer: "Ve a la página de Medidas y haz clic en 'Agregar Medidas'. Puedes ingresar tus medidas manualmente o usar nuestra herramienta de medición basada en cámara para obtener resultados más precisos. Admitimos tanto CM/kg como IN/lbs."
  },
  {
    category: "Medidas",
    question: "¿Puedo tener múltiples perfiles de medidas?",
    answer: "¡Sí! Puedes crear múltiples perfiles (por ejemplo, para diferentes formas de cuerpo o para miembros de la familia). Marca uno como 'Principal' para usarlo como predeterminado en las recomendaciones."
  },
  {
    category: "Medidas",
    question: "¿Qué tan precisas son las recomendaciones de talla?",
    answer: "Nuestras recomendaciones de talla se basan en tus medidas y tablas de tallas específicas de cada marca. Aunque nos esforzamos por ser precisos, recomendamos verificar la guía de tallas del artículo específico, ya que las tallas pueden variar entre marcas y estilos."
  },
  {
    category: "Análisis de Color",
    question: "¿Qué es el análisis de color?",
    answer: "El análisis de color determina qué colores complementan tu coloración natural (tono de piel, color de cabello y color de ojos). Usamos teoría del color profesional y el sistema de 12 estaciones para recomendar colores que te hacen lucir mejor."
  },
  {
    category: "Análisis de Color",
    question: "¿Cómo uso la función de análisis de color?",
    answer: "Navega a la página de Análisis de Color, sube una foto clara de tu rostro con luz natural y selecciona manualmente tu tono de piel y color de cabello. Nuestro algoritmo analizará tu coloración y proporcionará una paleta de colores personalizada."
  },
  {
    category: "Análisis de Color",
    question: "¿Puedo actualizar mi perfil de color?",
    answer: "¡Sí! Tu análisis de color se puede actualizar en cualquier momento desde la página de Análisis de Color. Esto es útil si cambia tu color de cabello o si deseas refinar tus resultados."
  },
  {
    category: "Recomendaciones",
    question: "¿Cómo funcionan las recomendaciones de IA?",
    answer: "Nuestra IA analiza tus medidas, perfil de color, preferencias de estilo y la ocasión para la que te estás vistiendo. Luego busca productos reales de minoristas que coincidan con tus criterios y ensambla outfits completos adaptados a ti."
  },
  {
    category: "Recomendaciones",
    question: "¿Puedo personalizar la ocasión o el clima?",
    answer: "¡Sí! Al generar recomendaciones, puedes especificar la ocasión (casual, negocios, formal, etc.), condiciones climáticas, código de vestimenta y presupuesto para obtener las sugerencias de outfit más relevantes."
  },
  {
    category: "Recomendaciones",
    question: "¿Cómo guardo un outfit?",
    answer: "En la página de Recomendaciones, haz clic en el ícono del corazón en cualquier outfit para guardarlo en tu colección de Outfits Guardados. Puedes acceder a tus outfits guardados en cualquier momento desde la página de Outfits Guardados en el menú de navegación."
  },
  {
    category: "Recomendaciones",
    question: "¿Qué significa 'Rebaja de Precio'?",
    answer: "Cuando un artículo en tu outfit guardado tiene un precio más bajo que cuando lo guardaste originalmente, mostraremos una insignia de 'Rebaja de Precio' con el porcentaje de descuento. Esto te ayuda a encontrar las mejores ofertas en artículos que te gustan."
  },
  {
    category: "Cuenta y Privacidad",
    question: "¿Cómo actualizo la información de mi perfil?",
    answer: "Ve a la página de Perfil desde el menú de navegación. Puedes actualizar tu nombre, foto de perfil y otros detalles de la cuenta. Haz clic en 'Guardar' para aplicar tus cambios."
  },
  {
    category: "Cuenta y Privacidad",
    question: "¿Cómo elimino mi cuenta?",
    answer: "Ve a tu página de Perfil y desplázate hasta la sección 'Zona de Peligro'. Haz clic en 'Eliminar Cuenta', escribe 'DELETE' para confirmar, y tu cuenta y todos los datos asociados se eliminarán permanentemente. Esta acción no se puede deshacer."
  },
  {
    category: "Cuenta y Privacidad",
    question: "¿Mis datos están seguros?",
    answer: "¡Sí! Utilizamos encriptación estándar de la industria para proteger tus datos. Tus medidas y fotos se almacenan de forma segura y nunca se comparten con terceros sin tu consentimiento."
  },
  {
    category: "Solución de Problemas",
    question: "¿Por qué no recibo recomendaciones?",
    answer: "Asegúrate de haber completado al menos tu perfil de medidas. Si aún no ves recomendaciones, intenta actualizar la página o verifica tu conexión a Internet. Contacta a soporte si el problema persiste."
  }
];
