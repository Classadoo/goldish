const {
  initializeFirebaseNode,
  Hydrator,
  MultiListener
} = require('../../dist/core/goldish')

const admin = require('firebase-admin')

var serviceAccount = require('./firebase-credentials.json')

const credential = admin.credential.cert(serviceAccount)

const pathMap = {
  User: {
    user: 'users/<id:uid>',
    // {promptId: docId}
    docsForPrompts: 'users/<id>/docsForPrompts',
    docForPrompt: 'users/<id>/docsForPrompts/<promptId:uid>',
    docForPromptDoc: 'users/<id>/docsForPrompts/<promptId:uid>/<docId:uid>'
  },
  Doc: {
    doc: 'docs/<docId:uid>',
    docs: 'docs',
    forPrompt: 'docs/<docId:uid>/forPrompt',
    charsTyped: 'docs/<docId:uid>/charsTyped',
    text: 'docs/<docId:uid>/text'
  },
  Prompts: {
    prompt: 'prompts/<promptId:uid>',
    prompts: 'prompts',
    description: 'prompts/<promptId:uid>/description'
  }
}

const dataHandlers = initializeFirebaseNode(pathMap, admin, {
  projectId: 'reflect-4b629',
  credential
})

dataHandlers.Doc.docs().log()
