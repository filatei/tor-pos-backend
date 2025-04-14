convert webpath photo from capacitor camera to File/Blob and send to nodejs/multer
const response = await fetch(webPath);
const imageBlob = await response.blob();
use formdata on the imageBlob