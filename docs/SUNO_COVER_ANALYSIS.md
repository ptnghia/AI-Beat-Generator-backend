# Suno Cover API - Analysis & Comparison

> Analysis of Suno Cover Generation API vs current DALL-E implementation

**Date**: December 13, 2025  
**Status**: 🔍 UNDER INVESTIGATION

---

## 📋 API Overview

### Suno Cover API Features

**Endpoint**: `POST /api/v1/suno/cover/generate`

**Input**:
- `taskId`: Original music generation task ID
- `callBackUrl`: Webhook for completion notification

**Output**:
- **2 different style cover images** (gives options!)
- Image URLs with 14-day retention
- PNG format (confirmed from callback examples)

**Workflow**:
1. Generate music → Get `taskId`
2. Submit cover request with `taskId`
3. Wait 30-60 seconds
4. Receive 2 cover image URLs via callback

---

## ❓ Unknown Information

### Critical Question: Image Dimensions?

**BeatStars Requirement**: 3000x3000px

**Suno Documentation**: 
- ❌ Does NOT specify image dimensions
- ❌ No width/height in API response
- ✅ Format confirmed: PNG
- ✅ Quantity: 2 images per request

**Callback Response Example**:
```json
{
  "code": 200,
  "data": {
    "images": [
      "https://tempfile.aiquickdraw.com/s/1753958521_xxx.png",
      "https://tempfile.aiquickdraw.com/s/1753958524_xxx.png"
    ],
    "taskId": "21aee3c3c2a01fa5e030b3799fa4dd56"
  }
}
```

⚠️ **No dimension info in response!**

---

## 🔬 Testing Strategy

Created test script: `scripts/test-suno-cover.ts`

**Test Flow**:
1. Find beat with `sunoTaskId`
2. Submit cover generation request
3. Poll for completion (30s intervals)
4. Download both generated images
5. Check dimensions using `image-size` package
6. Compare against BeatStars requirements (3000x3000px)

**Test Command**:
```bash
npx ts-node scripts/test-suno-cover.ts
```

---

## 📊 Current Implementation (DALL-E)

**File**: `src/services/cover-art.service.ts`

**Specifications**:
- ✅ Dimensions: **3000x3000px** (BeatStars compliant)
- ✅ Format: PNG
- ✅ Quality: HD (DALL-E 3)
- ✅ Customizable prompts
- ✅ Genre/mood specific

**Cost**:
- DALL-E 3 HD: ~$0.080 per image
- Standard: ~$0.040 per image

**Pros**:
- ✅ Guaranteed 3000x3000px
- ✅ Full control over prompts
- ✅ High quality, professional

**Cons**:
- ❌ Costs OpenAI API credits
- ❌ Multiple vendor dependencies
- ❌ Only 1 image per request

---

## 💡 Potential Benefits of Suno Cover

### If dimensions meet requirements:

1. **Cost Savings**
   - Use same Suno API subscription
   - No additional OpenAI costs
   - Simplify billing

2. **Single Vendor**
   - Music + Cover from same source
   - Better consistency
   - Easier integration

3. **Multiple Options**
   - Get 2 covers per request
   - User can choose preferred style
   - Better value

4. **Faster Generation**
   - 30-60 seconds (vs DALL-E can vary)
   - Callback mechanism
   - Automatic with music generation

### If dimensions DON'T meet requirements:

- ❌ Cannot use for BeatStars (strict 3000x3000 requirement)
- ❌ Would need to upscale (quality loss)
- ✅ Keep current DALL-E implementation

---

## 🎯 Decision Matrix

| Criteria | DALL-E (Current) | Suno Cover | Winner |
|----------|------------------|------------|--------|
| **Dimensions** | ✅ 3000x3000px | ❓ Unknown | ? |
| **Format** | ✅ PNG | ✅ PNG | = |
| **Quantity** | 1 image | 2 images | Suno |
| **Cost** | $0.04-0.08/image | Included in Suno | Suno |
| **Quality** | ✅ DALL-E 3 HD | ❓ Unknown | ? |
| **Customization** | ✅ Full control | ❓ Limited | DALL-E |
| **Integration** | Separate API | Same vendor | Suno |
| **Generation Time** | Variable | 30-60s | Suno |

**Conclusion**: Depends entirely on **dimensions**!

---

## 🚦 Test Results

### Test Status: ⏳ PENDING

Waiting for beat generation to complete...

**Expected Results**:

### Scenario A: ✅ Dimensions = 3000x3000px
**Recommendation**: **SWITCH to Suno Cover API**

**Implementation**:
```typescript
// Replace CoverArtService with SunoCoverService
export class SunoCoverService {
  async generateCover(sunoTaskId: string): Promise<string[]> {
    // Submit cover request
    // Poll for completion
    // Return array of 2 image URLs
  }
}
```

**Benefits**:
- ✅ Save OpenAI API costs
- ✅ Single vendor integration
- ✅ Get 2 options for selection
- ✅ Automatic with music

---

### Scenario B: ❌ Dimensions ≠ 3000x3000px
**Recommendation**: **KEEP DALL-E Implementation**

**Reasons**:
- ❌ BeatStars strict requirement: 3000x3000px
- ❌ Upscaling reduces quality
- ❌ Cannot compromise on professional standards

**Alternative**: Use Suno for preview/thumbnail only

---

## 📝 Implementation Plan (If Approved)

### Phase 1: Create SunoCoverService
```typescript
src/services/
└── suno-cover.service.ts  // NEW
```

**Features**:
- Submit cover generation
- Poll for completion
- Handle callbacks
- Download and save images
- Select best image (or let user choose)

### Phase 2: Update OrchestratorService
```typescript
// Replace
const coverArtPath = await this.coverArtService.generateCoverArt(...);

// With
const coverImages = await this.sunoCoverService.generateCover(sunoTaskId);
const coverArtPath = coverImages[0]; // or selection logic
```

### Phase 3: Database Updates
```prisma
model Beat {
  // ... existing
  coverArtPath      String?   // Primary cover
  alternateCoverPath String?  // Second option from Suno
}
```

### Phase 4: API Endpoints
```
GET /api/beats/:id/covers
  - Return both cover options
  - Let user choose

POST /api/beats/:id/select-cover
  - Set primary cover
```

---

## 🔄 Migration Strategy

### If switching to Suno:

1. **Gradual Migration**
   - New beats: Use Suno
   - Existing beats: Keep DALL-E covers

2. **Fallback Mechanism**
   ```typescript
   try {
     return await sunoCoverService.generate(taskId);
   } catch (error) {
     // Fallback to DALL-E if Suno fails
     return await coverArtService.generate(beat);
   }
   ```

3. **A/B Testing**
   - 50% Suno, 50% DALL-E
   - Compare quality and user preference
   - Measure sales impact

---

## 💰 Cost Analysis

### Monthly Costs (100 beats/month)

**Current (DALL-E)**:
- 100 beats × $0.080 = $8.00/month
- Total: **$8.00/month**

**With Suno (if dimensions OK)**:
- Included in Suno subscription
- Total: **$0.00 additional**
- **Savings: $8.00/month (100%)**

**Annual Savings**: $96.00

Plus:
- 2 covers per beat (200 total)
- Better value proposition

---

## ⚠️ Risk Assessment

### Risks of Switching:

1. **Quality Unknown**
   - May not match DALL-E 3 quality
   - Need visual comparison

2. **Less Customization**
   - Cannot control prompts
   - Automatic generation based on music

3. **Vendor Lock-in**
   - More dependent on Suno
   - If Suno has issues, affects both music + covers

4. **URL Expiration**
   - 14-day retention (vs permanent with downloads)
   - Must download immediately

### Mitigation:

- ✅ Keep DALL-E as fallback
- ✅ Download covers immediately
- ✅ Quality check before switching
- ✅ User acceptance testing

---

## 📌 Next Steps

1. ⏳ **Wait for test results** - Check dimensions
2. ✅ **Visual quality comparison** - If 3000x3000
3. ✅ **User testing** - Show samples to target users
4. ✅ **Decision** - Switch or keep current
5. ✅ **Implementation** - If approved

---

## 🎓 Lessons Learned

1. **Always verify dimensions** - APIs don't always specify
2. **Test before committing** - Don't assume compatibility
3. **Cost vs Quality tradeoff** - Sometimes paying more is worth it
4. **Vendor diversity** - Don't put all eggs in one basket
5. **BeatStars requirements are strict** - Must meet exactly

---

## 📞 References

- [Suno Cover API Docs](https://docs.sunoapi.org/suno-api/cover-suno)
- [BeatStars Guide](docs/BEATSTARS_GUIDE.md) - 3000x3000px requirement
- [Current Implementation](src/services/cover-art.service.ts)
- [Test Script](scripts/test-suno-cover.ts)

---

**Status**: Awaiting test results to make final decision...

Will update this document once dimensions are confirmed! 🔍
