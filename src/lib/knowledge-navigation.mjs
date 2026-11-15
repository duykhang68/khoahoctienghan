import order from '../data/knowledge-navigation.json' with { type: 'json' };
export function orderedTopics(topics, sequence=order){
 const byId=new Map(topics.map(x=>[x.id,x]));
 if(byId.size!==topics.length||!Array.isArray(sequence)||sequence.length!==topics.length||new Set(sequence).size!==topics.length||!sequence.every(id=>byId.has(id)))throw Error('Knowledge navigation must contain each approved topic exactly once');
 return sequence.map(id=>byId.get(id));
}
