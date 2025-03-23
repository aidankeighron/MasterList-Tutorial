import apiKey from "./hidden";
document.getElementById('myFile').addEventListener('change', async function() {
    /// get fileUploaded, returns file object at index 0
    let fileUploaded = this.files.item(0);
    // create form object for pdf send to ocr api
    const form = new FormData();
    form.append('purpose', 'ocr');
    form.append('file', new File([fileUploaded], `${fileUploaded.name}`));
    if(fileUploaded == null){
        return
    }
    const uploaded_pdf = await fetch('https://api.mistral.ai/v1/files', {
        method: 'POST',
        headers: {
            "Authorization": `Bearer ${apiKey}`
        },
        body: form,
    })
    const pdfJSON = await uploaded_pdf.json();
    console.log(pdfJSON)
    /// get url
    const signedUrl = await fetch(`https://api.mistral.ai/v1/files/${pdfJSON.id}/url?expiry=24`, {
        method: 'GET',
        headers: {
            "Accept": "application/json" ,
            "Authorization": `Bearer ${apiKey}`
        },
    })
    const responseJSON = await signedUrl.json();
    console.log("here",responseJSON)
    /// communicate with model and turn pdf to md
    const ocrResponse = await fetch(`https://api.mistral.ai/v1/ocr`, {
        method: 'POST',
        headers: {
            "Content-Type": "application/json" ,
            "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            "model": "mistral-ocr-latest",
            "document": {
                "type": "document_url",
                "document_url": responseJSON.url,
            },
            "include_image_base64": true
        }),
    })
    const pages = await ocrResponse.json();
    console.log(pages)
})








