from transformers import pipeline

llm = pipeline(
    "text-generation",
    model="mistralai/Mistral-3B-Instruct",
    device_map="auto",
    torch_dtype="auto"
)

prompt = "Write a coherent 200-word paragraph about AI in education."
result = llm(prompt, max_new_tokens=600, do_sample=True, temperature=0.7, top_p=0.9, repetition_penalty=1.2)

print(result[0]['generated_text'])
