import {mountQueueProgress} from './progress-browser.mjs';
import {officeQueueClient} from './queue-client.mjs';
mountQueueProgress(document.querySelector('[data-queue-progress]'),{client:officeQueueClient(),showEvidence:true});
