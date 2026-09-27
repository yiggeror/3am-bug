# Montage images into a grid: python3 grid.py out.jpg cols w img1 img2 ...
import sys
from PIL import Image
out, cols, w = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
ims = [Image.open(p).convert('RGB') for p in sys.argv[4:]]
h = int(w * ims[0].height / ims[0].width)
rows = (len(ims) + cols - 1) // cols
G = Image.new('RGB', (cols * w, rows * h), (20, 20, 20))
for i, im in enumerate(ims):
    G.paste(im.resize((w, h), Image.LANCZOS), ((i % cols) * w, (i // cols) * h))
G.save(out, quality=88)
print(out)
