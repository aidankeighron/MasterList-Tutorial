import apiKeys from "./hidden.js";
const mistralApiKey = apiKeys.mistralApiKey;
const geminiApiKey = apiKeys.geminiApiKey;

/**
 * Convert a PDF to a JSON object
 * 
 * @param {FormData} form 
 * @returns {Promise<Object>}
 */
async function PDFToJson(form) {
    const uploadedPDF = await fetch('https://api.mistral.ai/v1/files', {
        method: 'POST',
        headers: {
            "Authorization": `Bearer ${mistralApiKey}`
        },
        body: form,
    })
    const PDFJson = await uploadedPDF.json();
    
    const signedUrl = await fetch(`https://api.mistral.ai/v1/files/${PDFJson.id}/url?expiry=24`, {
        method: 'GET',
        headers: {
            "Accept": "application/json" ,
            "Authorization": `Bearer ${mistralApiKey}`
        },
    })
    const responseJSON = await signedUrl.json();

    // communicate with model and turn pdf to md
    const ocrResponse = await fetch(`https://api.mistral.ai/v1/ocr`, {
        method: 'POST',
        headers: {
            "Content-Type": "application/json" ,
            "Authorization": `Bearer ${mistralApiKey}`
        },
        body: JSON.stringify({
            "model": "mistral-ocr-latest",
            "document": {
                "type": "document_url",
                "document_url": responseJSON.url,
            },
            "include_image_base64": true
        }),
    });

    return await ocrResponse.json();
}

async function JsonToCSV(markdownExport) {
    const geminiRequestResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,{
        method: 'POST',
        headers: {
            'Content-Type': "application/json"
        },
        body: JSON.stringify({
            "contents": [{
                "parts": [{"text":`I've attached a markdown file of my class schedule. Can you extract all the assignments and return a response in CSV format with the following columns?
                            Due Date (e.g., 3/17)
                            Class (e.g., CSE 410)
                            Assignment Name with any important details
                            Assignment Type — must be one of: [Homework, Reading, Project, Exam]
                            Checkbox (leave unchecked)
                            Please ignore lecture entries." 
                            ${markdownExport}`}]
            }]
        })
    });

    return await geminiRequestResponse.json();
}

/**
 * Create a file for the user to download
 * 
 * @param {string} filename 
 * @param {string} content 
 */
function createFileAndDownload(filename, content) {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    const p = document.createElement('p')
    p.innerHTML = filename
    link.append(p)
}

document.getElementById('file-upload').addEventListener('change', async () => {
    // Get fileUploaded, returns file object at index 0
    const fileUploaded = this.files.item(0);
    if(fileUploaded == null){
        return;
    }

    // create form object for pdf send to ocr api
    const form = new FormData();
    form.append('purpose', 'ocr');
    form.append('file', new File([fileUploaded], `${fileUploaded.name}`));

    let ocrJson = await PDFToJson(form);

    let markdownExport = "";
    for(const element of ocrJson.pages){
        markdownExport += element.markdown + " ";
    }
    
    const geminiJson = await JsonToCSV(markdownExport);

    const geminiResponse = geminiJson.candidates[0].content.parts[0].text;
    createFileAndDownload("downloadable.csv", geminiResponse.slice(6).slice(0,-3))
});