// AI Certificate Parsing Service - Uses OpenAI via Replit AI Integrations
import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Import pdf-parse PDFParse class
import { PDFParse } from 'pdf-parse';

// Import pdf-to-img for converting scanned PDFs to images
import { pdf } from 'pdf-to-img';

// Wrapper function for PDF parsing
async function extractPdfTextFromBuffer(buffer: Buffer): Promise<string> {
  try {
    // Convert Buffer to Uint8Array as required by pdf-parse
    const uint8Array = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    const parser = new PDFParse(uint8Array) as unknown as { 
      load: () => Promise<void>; 
      getText: () => Promise<string | { text: string }>;
      getInfo: () => Promise<{ numPages: number; [key: string]: unknown }>;
      getPageText: (pageNum: number) => Promise<string | { text: string }>;
    };
    await parser.load();
    
    // Get document info for debugging
    try {
      const info = await parser.getInfo();
      console.log('PDF Info - Pages:', info.numPages);
    } catch (e) {
      console.log('Could not get PDF info');
    }
    
    // Try getText first
    let result = await parser.getText();
    let text = '';
    if (typeof result === 'string') {
      text = result;
    } else if (result?.text) {
      text = result.text;
    }
    
    // If getText returned minimal content, try getting text page by page
    if (text.trim().length < 100) {
      console.log('getText returned minimal content, trying page-by-page extraction...');
      try {
        const info = await parser.getInfo();
        const pages: string[] = [];
        for (let i = 1; i <= Math.min(info.numPages, 10); i++) {
          const pageResult = await parser.getPageText(i);
          if (typeof pageResult === 'string') {
            pages.push(pageResult);
          } else if (pageResult?.text) {
            pages.push(pageResult.text);
          }
        }
        const pageText = pages.join('\n');
        if (pageText.trim().length > text.trim().length) {
          text = pageText;
          console.log('Page-by-page extraction got more content:', text.length, 'chars');
        }
      } catch (e) {
        console.log('Page-by-page extraction failed:', e);
      }
    }
    
    // Log first 500 chars for debugging
    console.log('PDF text preview (first 500 chars):', text.substring(0, 500));
    
    return text;
  } catch (error) {
    console.error('PDF parsing error:', error);
    return '';
  }
}

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

export interface ParsedCertificate {
  certificateType: 'gas' | 'electrical' | 'smoke_alarm' | 'pool' | 'fire' | 'pest' | 'asbestos' | 'plumbing' | 'building' | 'general';
  issueDate: string | null;
  expiryDate: string | null;
  certificateNumber: string | null;
  issuerName: string | null;
  issuerLicense: string | null;
  propertyAddress: string | null;
  roomsCovered: string[];
  appliancesCovered: string[];
  complianceStatus: 'compliant' | 'non_compliant' | 'unknown';
  notes: string | null;
  confidence: number;
}


export async function parseCertificateContent(
  subject: string,
  body: string,
  fileName?: string,
  attachmentBuffer?: Buffer
): Promise<ParsedCertificate> {
  try {
    // Extract PDF text if attachment buffer is provided
    let pdfContent = '';
    let useVision = false;
    let pdfBase64 = '';
    
    // Store a fresh copy of the buffer BEFORE any processing (pdf-parse may detach it)
    let originalBufferCopy: Buffer | undefined;
    
    if (attachmentBuffer && fileName?.toLowerCase().endsWith('.pdf')) {
      // Create a fresh copy immediately - pdf-parse may detach the original buffer
      originalBufferCopy = Buffer.from(attachmentBuffer);
      console.log(`Saved buffer copy: ${originalBufferCopy.length} bytes`);
      
      console.log('Extracting text from PDF attachment...');
      pdfContent = await extractPdfTextFromBuffer(attachmentBuffer);
      console.log(`Extracted ${pdfContent.length} characters from PDF`);
      
      // If minimal text extracted, this is likely a scanned/image-based PDF
      // Use GPT-4 Vision to read the document
      if (pdfContent.trim().length < 200) {
        console.log('PDF appears to be scanned/image-based, using GPT-4 Vision...');
        useVision = true;
        pdfBase64 = originalBufferCopy.toString('base64');
      }
    }

    const prompt = `You are an expert at analyzing property compliance certificates, inspection reports, and official government forms.
Analyze the following document content carefully to extract certificate details.

CRITICAL ADDRESS EXTRACTION INSTRUCTIONS:
The property address is ESSENTIAL - search thoroughly for it using these strategies:

1. LOOK FOR LABELED FIELDS - Certificates often have addresses in labeled boxes or form fields:
   - "Property Address", "Site Address", "Address of Building", "Service Address"
   - "Location", "Premises", "Installation Address", "Job Site"
   - "Address of the land", "Street Address", "Property Location"
   - Box 1, Box 2, or numbered sections near the top of forms

2. LOOK IN COMMON LOCATIONS:
   - Header/letterhead area (first few lines)
   - Near customer/owner details
   - Near job/work order numbers
   - In table cells or form fields
   - Footer area with site details

3. ADDRESS FORMAT CLUES - Look for patterns like:
   - Number + Street Name (e.g., "123 Main Street")
   - Unit/Lot numbers (e.g., "Unit 5/123 Smith Rd")
   - Suburb + State + Postcode (e.g., "Melbourne VIC 3000")
   - Full addresses on single or multiple lines

4. CERTIFICATE-SPECIFIC LOCATIONS:
   - Gas certificates: "Installation Address", "Appliance Location"
   - Electrical certificates: "Work Site", "Installation Address"
   - Smoke alarm certificates: "Property Address", "Installed At"
   - Pool certificates: "Pool Location", "Property Address"
   - Building forms (Form 12/15/16): Box 2, "Address of building"
   - Pest reports: "Inspection Address", "Property Inspected"

Extract the COMPLETE address exactly as written, including unit numbers if present.

Email Subject: ${subject}
Email Body: ${body}
${fileName ? `Attachment Filename: ${fileName}` : ''}
${pdfContent ? `\n--- CERTIFICATE DOCUMENT CONTENT ---\n${pdfContent.substring(0, 12000)}\n--- END OF DOCUMENT ---` : ''}

Extract the following information in JSON format:
{
  "certificateType": "gas|electrical|smoke_alarm|pool|fire|pest|asbestos|plumbing|building|general",
  "issueDate": "YYYY-MM-DD or null",
  "expiryDate": "YYYY-MM-DD or null", 
  "certificateNumber": "string or null",
  "issuerName": "company/tradesperson name or null",
  "issuerLicense": "license number or null",
  "propertyAddress": "full address including street, suburb, state, postcode - THIS IS CRITICAL, search thoroughly",
  "roomsCovered": ["list of rooms mentioned, e.g. kitchen, laundry, garage"],
  "appliancesCovered": ["list of appliances, e.g. gas heater, hot water system, cooktop"],
  "complianceStatus": "compliant|non_compliant|unknown",
  "notes": "any important notes or issues mentioned",
  "confidence": 0.0-1.0 (how confident you are in the extraction)
}

Certificate type mapping:
- Gas safety, gas fitting, gas appliance, gas certificate → "gas"
- Electrical, RCD, safety switch, power, wiring → "electrical"  
- Smoke alarm, smoke detector, fire alarm → "smoke_alarm"
- Pool safety, pool fence, pool compliance → "pool"
- Fire safety, fire extinguisher, fire blanket → "fire"
- Pest inspection, termite, timber pest → "pest"
- Asbestos, hazmat, hazardous materials → "asbestos"
- Plumbing, water, backflow, drainage → "plumbing"
- Building inspection, Form 12, Form 15, Form 16, Final inspection, Occupancy certificate, Building certification, renovation → "building"
- Other/unclear → "general"

Return ONLY valid JSON, no other text.`;

    let response;
    
    if (useVision && originalBufferCopy) {
      // Use GPT-4o with vision for scanned/image-based PDFs
      // Write PDF to temp file to avoid buffer detachment issues with pdf-to-img
      console.log('Converting PDF to images for GPT-4o vision analysis...');
      console.log(`PDF buffer size: ${originalBufferCopy.length} bytes`);
      
      // Write to temp file to avoid buffer issues
      const tempDir = os.tmpdir();
      const tempPdfPath = path.join(tempDir, `cert_${Date.now()}.pdf`);
      
      try {
        // Write PDF buffer to temp file
        fs.writeFileSync(tempPdfPath, originalBufferCopy);
        console.log(`Wrote PDF to temp file: ${tempPdfPath}`);
        
        // Convert PDF pages to images using file path
        const imageContents: { type: 'image_url'; image_url: { url: string; detail: 'high' } }[] = [];
        let pageNum = 0;
        
        console.log('Converting PDF pages to images...');
        const document = await pdf(tempPdfPath, { scale: 2.0 });
        
        for await (const pageImage of document) {
          pageNum++;
          console.log(`Converted page ${pageNum} to image (${pageImage.length} bytes)`);
          
          const imageBase64 = Buffer.from(pageImage).toString('base64');
          imageContents.push({
            type: 'image_url',
            image_url: {
              url: `data:image/png;base64,${imageBase64}`,
              detail: 'high'
            }
          });
          
          // Only process first 2 pages
          if (pageNum >= 2) break;
        }
        
        // Clean up temp file
        try { fs.unlinkSync(tempPdfPath); } catch (e) { /* ignore cleanup errors */ }
        
        if (imageContents.length === 0) {
          throw new Error('No pages could be converted to images');
        }
        
        console.log(`Calling GPT-4o with ${imageContents.length} page images...`);
        response = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                ...imageContents
              ]
            }
          ],
          temperature: 0.1,
          max_tokens: 1500,
        });
        console.log('GPT-4o vision response received');
        console.log('Response content preview:', response.choices[0]?.message?.content?.substring(0, 200));
      } catch (visionError) {
        // Clean up temp file on error
        try { fs.unlinkSync(tempPdfPath); } catch (e) { /* ignore */ }
        
        console.error('Vision extraction failed:', visionError instanceof Error ? visionError.message : visionError);
        console.error('Vision error stack:', visionError instanceof Error ? visionError.stack : 'no stack');
        // Fall back to text-only analysis
        console.log('Falling back to text-only GPT-4o-mini analysis...');
        response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1,
          max_tokens: 1000,
        });
      }
    } else {
      // Use standard text model for text-based PDFs
      response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 1000,
      });
    }

    const content = response.choices[0]?.message?.content || '{}';
    
    // Parse the JSON response
    const parsed = JSON.parse(content.replace(/```json\n?|\n?```/g, '').trim());
    
    return {
      certificateType: parsed.certificateType || 'general',
      issueDate: parsed.issueDate || null,
      expiryDate: parsed.expiryDate || null,
      certificateNumber: parsed.certificateNumber || null,
      issuerName: parsed.issuerName || null,
      issuerLicense: parsed.issuerLicense || null,
      propertyAddress: parsed.propertyAddress || null,
      roomsCovered: parsed.roomsCovered || [],
      appliancesCovered: parsed.appliancesCovered || [],
      complianceStatus: parsed.complianceStatus || 'unknown',
      notes: parsed.notes || null,
      confidence: parsed.confidence || 0.5,
    };
  } catch (error) {
    console.error('AI certificate parsing error:', error);
    // Return default values on error
    return {
      certificateType: 'general',
      issueDate: null,
      expiryDate: null,
      certificateNumber: null,
      issuerName: null,
      issuerLicense: null,
      propertyAddress: null,
      roomsCovered: [],
      appliancesCovered: [],
      complianceStatus: 'unknown',
      notes: 'AI parsing failed - manual review required',
      confidence: 0,
    };
  }
}

// Map certificate type to room types that should be linked
export function getCertificateRoomTypes(certificateType: string): string[] {
  const roomMappings: Record<string, string[]> = {
    'gas': ['kitchen', 'laundry', 'living_room', 'family_room', 'lounge', 'garage', 'outdoor'],
    'electrical': ['power_box', 'garage', 'kitchen', 'laundry'],
    'smoke_alarm': ['master_bedroom', 'bedroom_1', 'bedroom_2', 'bedroom_3', 'bedroom_4', 'hallway', 'living_room'],
    'pool': ['pool'],
    'fire': ['garage', 'kitchen', 'hallway'],
    'pest': [], // Whole property
    'asbestos': [], // Whole property
    'plumbing': ['kitchen', 'laundry', 'main_bathroom', 'master_ensuite', 'powder_room'],
    'building': [], // Whole property - Form 12/15/16 building certificates cover entire property
    'general': [],
  };
  return roomMappings[certificateType] || [];
}

// Map certificate type to inspection item names that should be marked as covered
// These are partial match patterns - items containing any of these strings will be matched
export function getCertificateInspectionItems(certificateType: string): string[] {
  const itemMappings: Record<string, string[]> = {
    'gas': ['Gas Appliance', 'Gas Cooktop', 'Gas Connection', 'Gas Heater'],
    'electrical': ['RCD', 'Safety Switch', 'Electrical Panel', 'Circuit Breaker', 'Panel Condition'],
    'smoke_alarm': ['Smoke Detector', 'Smoke Alarm', 'Fire Alarm', 'Smoke Sensor'],
    'pool': ['Pool Safety', 'Pool Pump', 'Pool Filter', 'Pool Chlorinator', 'Pool Fence'],
    'fire': ['Fire Extinguisher', 'Fire Safety', 'Fire Blanket'],
    'pest': ['Pest', 'Termite'],
    'asbestos': ['Asbestos'],
    'plumbing': ['Hot Water', 'PTR Valve', 'Flexi Hose', 'Water Heater', 'Tempering Valve'],
    'building': ['Building Inspection', 'Structural', 'Occupancy', 'Final Inspection', 'Renovation'],
    'general': [],
  };
  return itemMappings[certificateType] || [];
}
