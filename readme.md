The imageserver/ hosts a backend service that runs on an L40S Nvidia GPU instance. It generates images based on text prompts using the Stable Diffusion model. It takes care of cold start, and keeping instance warm as its being used.

Hence we can host more models there can require GPU. It is best to pair it with some event orchestration at the frontend to avoid hitting the endpoint as it's running on a paid GPU instance.

Not hosting the image captioning model here as it runs fine on CPU. But it does require memory and might not work with vercel.

BLIP large is too large for vercel, but CPU inference is okay. vit-gpt2 is smaller, but maybe risky to run on vercel, I am not sure.

Either way these models don't require GPU and hosting them in imageserver would cause GPU to be warmed up unnecessarily.

Also SDXL uses plenty VRAM already.

Also, we are caching the models so there is a cache volume, no loading everytime a new container spins up.

Using supabase object storage.

Trying parler tts, https://github.com/huggingface/parler-tts/blob/main/INFERENCE.md , apparently flash attention and all is supported so I should look into those later.

TTS works on CPU but GPU is much faster so going with that.

I am just deploying it on its own server, instead of comining with image generation server.
I think it will give better performance cold start wise, and concurrently serving both image generation and tts on same gpu instance might be tricky.

Need to look into this actually, because I am not sure how hte difference is in serverless. Getting better fault tolerance by separating them is good too.

## Dev Usage Guide: **1. Put the backend URL in `.env`:**

```env
IMAGE_GENERATION="...CANNOT BE PUBLICALLY SHARED..."
```

---

## **2. Make a POST request like this:**

```ts
const res = await fetch(process.env.IMAGE_GENERATION!, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ prompt: "prompt for image" }),
});

const { file_key, public_url } = await res.json();
```

---

## **3. Use the image URL like this:**

```jsx
<img src={public_url} alt="generated" />
```

---

## **Response shape:**

```json
{
  "file_key": "xxxx.png",
  "public_url": "https://...supabase.co/storage/.../xxxx.png"
}
```

---

## Using modal

- go to the folder which has the main.py, ie file you want to use for hosting, then

```bash
modal setup
```

This will guide you through setting up your modal project.

```bash
modal run main.py
```

This will run the local entrypoint function in main.py
If this is working fine, you can deploy the function to modal cloud using

```bash
modal deploy main.py
```
