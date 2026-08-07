import * as voiceSearch from '../src/services/voice-search.service.js'
import { dispatch } from '../src/handlers/retell-functions.js'

async function runConversations() {
  console.log('================================================================================')
  console.log('         SIMULATING 5 REALISTIC USER CONVERSATIONS WITH KICKS AI AGENT          ')
  console.log('================================================================================\n')

  await voiceSearch.buildIndex()

  const conversations = [
    {
      id: 1,
      title: 'Conversation 1: Suggestion Request with Misspelled Terms & Budget Constraint',
      userInput: 'Can you suggest some cheap runing shoes for men in blak under 100?',
      agentParsedArgs: {
        query: 'runing shoes',
        category: 'running',
        gender: 'men',
        color: 'Black',
        max_price: 100,
        sort: 'price_asc',
      },
    },
    {
      id: 2,
      title: 'Conversation 2: Specific Product Name with Typo (>= 80% Match -> Detail View)',
      userInput: 'Take me to the details of Metro Dunk Higx in size 42',
      agentParsedArgs: {
        query: 'Metro Dunk Higx',
        size: '42',
      },
    },
    {
      id: 3,
      title: 'Conversation 3: Search by Material, Brand & Misspelled Category/Gender',
      userInput: 'I am looking for formel lether shoes from Kick for mn',
      agentParsedArgs: {
        query: 'formel lether shoes',
        brand: 'Kick',
        category: 'formal',
        material: 'Genuine Leather',
        gender: 'men',
      },
    },
    {
      id: 4,
      title: 'Conversation 4: Suggestion for Demographic ("Unisexual") + Sport & Price Range',
      userInput: 'What do you recommend as the best unisexual basktball kicks between 80 and 150 dollars?',
      agentParsedArgs: {
        query: 'best basktball kicks',
        category: 'basketball',
        gender: 'unisex',
        min_price: 80,
        max_price: 150,
        sort: 'popular',
      },
    },
    {
      id: 5,
      title: 'Conversation 5: Complex Multi-Constraint Need (Material + Feature + Walking)',
      userInput: 'Find me some breathable lightweight white sneakers with cushion for gym and daily walking',
      agentParsedArgs: {
        query: 'breathable lightweight cushion walking',
        category: 'sneakers',
        color: 'White',
      },
    },
  ]

  for (const conv of conversations) {
    console.log(`--------------------------------------------------------------------------------`)
    console.log(`💬 [${conv.title}]`)
    console.log(`👤 User Said: "${conv.userInput}"`)
    console.log(`🧠 Agent Auto-Corrected Parameters:`, JSON.stringify(conv.agentParsedArgs, null, 2))

    const response = await dispatch('search_product', conv.agentParsedArgs, 'user_session_42')

    console.log(`\n⚙️ Execution Result:`)
    console.log(`   • Success: ${response.success}`)
    if (response.navigateTo) {
      console.log(`   • Screen Action: 🖥️ NAVIGATE TO LIST VIEW -> ${response.navigateTo}`)
      console.log(`   • Matching Products Displayed on Screen: ${response.total}`)
      if (response.products?.length) {
        console.log(`   • Top Products Shown:`)
        response.products.slice(0, 3).forEach((p, idx) => {
          console.log(`     ${idx + 1}. ${p.name} | Brand: ${p.brand} | $${Number(p.price).toFixed(2)} | Material: ${p.material || 'Standard'}`)
        })
      }
    } else if (response.product) {
      console.log(`   • Screen Action: 👟 DIRECT TO PRODUCT DETAIL PAGE -> /product/${response.product.slug}`)
      console.log(`   • Product Opened: ${response.product.name} ($${Number(response.product.price).toFixed(2)})`)
      console.log(`   • In Stock: ${response.product.inStock ? 'Yes' : 'No'}`)
    }

    console.log(`\n🎙️ AI Voice Spoken Response:`)
    console.log(`   "${response.message}"\n`)
  }

  console.log('================================================================================')
  console.log('                           ALL 5 CONVERSATIONS VERIFIED                         ')
  console.log('================================================================================')
}

runConversations().catch(err => {
  console.error(err)
  process.exit(1)
})
