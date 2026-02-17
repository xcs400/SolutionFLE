from PIL import Image

def crop_qr_code(image_path, output_path):
    try:
        img = Image.open(image_path)
        width, height = img.size
        
        # Coordonnées estimées du QR Code (panneau central bas)
        # Ajustement basé sur l'image IMG_6328.jpg (vue 10)
        # Panneau central : ~33% à ~66% largeur
        # Hauteur : QR code en bas, donc ~60% à ~90%
        
        box = (
            int(width * 0.42),    # left
            int(height * 0.65),   # top
            int(width * 0.58),    # right
            int(height * 0.85)    # bottom
        )
        
        cropped_img = img.crop(box)
        cropped_img.save(output_path)
        print(f"QR Code extracted to {output_path}")
        
    except Exception as e:
        print(f"Error: {e}")

crop_qr_code('c:/fle/site/public/IMG_6328.jpg', 'c:/fle/site/public/qrcode_extracted.jpg')
