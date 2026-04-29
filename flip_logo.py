from PIL import Image

def flip_image():
    img_path = "assets/images/logo.png"
    img = Image.open(img_path)
    img_flipped = img.transpose(Image.FLIP_LEFT_RIGHT)
    img_flipped.save(img_path)
    print("Logo flipped horizontally")

if __name__ == "__main__":
    flip_image()
