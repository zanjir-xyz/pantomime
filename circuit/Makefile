all:
	circom hide.circom --r1cs --wasm --sym
	rm -rf *.zkey
	snarkjs groth16 setup hide.r1cs powersOfTau28_hez_final_08.ptau hide_0000.zkey
	snarkjs zkey contribute hide_0000.zkey hide_0001.zkey --name="Keyvan Kambakhsh" -v
	snarkjs zkey export verificationkey hide_0001.zkey verification_key.json
	snarkjs zkey export solidityverifier hide_0001.zkey ../contract/src/Verifier.sol
