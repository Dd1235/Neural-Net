## **1. Put the backend URL in `.env`:**

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
