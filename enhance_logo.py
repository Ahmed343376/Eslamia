from PIL import Image

def enhance_logo():
    img_path = "assets/images/logo.png"
    try:
        img = Image.open(img_path).convert("RGBA")
        
        r, g, b, a = img.split()
        
        # Boost alpha: Any semi-transparent pixel becomes much more opaque
        # This fixes "eaten" thin lines.
        a = a.point(lambda p: min(255, int(p * 5))) 
        
        # Also ensure all non-transparent pixels are pure white for maximum sharpness
        r = r.point(lambda p: 255)
        g = g.point(lambda p: 255)
        b = b.point(lambda p: 255)
        
        img = Image.merge("RGBA", (r, g, b, a))
        img.save(img_path, "PNG")
        print("Logo enhanced successfully.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    enhance_logo()
