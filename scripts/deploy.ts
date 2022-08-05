import { ethers } from "hardhat";

//convert to hex and pad with leading zeros to get desired number of bytes
const toHexBytes = (val: number, bytes: number) => {
  const hex = ethers.utils.hexlify(val).substring(2);
  const requiredBytes = hex.length/2;
  if (requiredBytes > 2*bytes)
    throw Error("Could not convert " + val + "(= 0x" + hex + " ) does not fit in " + bytes + "bytes");

  return "00".repeat(bytes - requiredBytes) + hex;
}

//minimalist constructor that simply copies the deployedBytecode
const blankConstructor = (deployedBytecodeSize: number) =>
  "0x" +
  "61" + //PUSH2
  toHexBytes(deployedBytecodeSize, 2) +
  "80" + //DUP
  "60" + //PUSH1
  "0c" + //constructor code size (=12 bytes)
  "60" + //PUSH1
  "00" + //CODECOPY dstOst argument
  "39" + //CODECOPY
  "60" + //PUSH1
  "00" + //RETURN ost argument
  "f3"; //RETURN

async function main() {

  const [deployer] = await ethers.getSigners();
  const factory = await (await (await ethers.getContractFactory("TestFactory")).deploy()).deployed();

  let factoryNonce = 1;
  let deployerNonce = await deployer.getTransactionCount();

  async function test(deployedBytecode: string, fix: boolean) {
    const size = deployedBytecode.length/2;
    const dummyBytecode = blankConstructor(size) + deployedBytecode;

    try {
      console.log("> Normal deployment:");
      await deployer.sendTransaction({data: dummyBytecode});
      console.log("\tsuccess");
      const expectedAddress = ethers.utils.getContractAddress({from: deployer.address, nonce: deployerNonce});
      ++deployerNonce;
      const actual = await ethers.provider.getCode(expectedAddress);
      // console.log(expectedAddress);
      // console.log(actual);
      console.log("\tdeployed bytecode matches:", actual === "0x"+deployedBytecode);
    }
    catch (error) {
      console.log("\tfailed:", error);
    }
  
    try {
      console.log("> TestFactory.create:");
      await factory.create(dummyBytecode, fix ? {gasLimit: 4000000} : {});
      console.log("\tsuccess");
      const expectedAddress = ethers.utils.getContractAddress({from: factory.address, nonce: factoryNonce});
      ++factoryNonce;
      ++deployerNonce;
      const actual = await ethers.provider.getCode(expectedAddress);
      // console.log(expectedAddress);
      // console.log(actual);
      console.log("\tdeployed bytecode matches:", actual === "0x"+deployedBytecode);
    }
    catch (error) {
      console.log("\tfailed:", error);
    }
  }

  const CRITICAL_SIZE = 14375;

  console.log("-----------------------------------------");
  console.log(">>>> See it work:");
  await test("ff".repeat(CRITICAL_SIZE), false);

  console.log("----------------");

  console.log(">>>> See it fail:");
  await test("ff".repeat(CRITICAL_SIZE+1), false);

  console.log("----------------");

  console.log(">>>> See it work for a larger contract that");
  console.log("     contains bytes that are 0 in its deploy code:")
  await test("ff00".repeat((CRITICAL_SIZE+1)/2 + 1000), false);

  console.log("----------------");

  console.log(">>>> See it fixed:");
  await test("ff".repeat(CRITICAL_SIZE+1), true);
  console.log("-----------------------------------------");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
