console.log('Start of code');

async function wait() {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  await sleep(5000); // await needs to be inside an async function
  // code after await and INSIDE THE FUNCTION is executed after the wait time
  // TODO: insert code to do after below
  console.log('After 5 seconds');
}

wait();
