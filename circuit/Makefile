all:
	circom hide.circom --r1cs --wasm --sym
	rm -rf *.zkey
	snarkjs groth16 setup hide.r1cs powersOfTau28_hez_final_08.ptau ../front/public/hide_0000.zkey
	snarkjs zkey contribute ../front/public/hide_0000.zkey ../front/public/hide_0001.zkey --name="Keyvan Kambakhsh" -v
	snarkjs zkey export verificationkey ../front/public/hide_0001.zkey verification_key.json
	snarkjs zkey export solidityverifier ../front/public/hide_0001.zkey ../contract/src/Verifier.sol
	mv hide_js/hide.wasm ../front/public
