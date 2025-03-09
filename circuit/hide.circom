pragma circom 2.1.6;

include "circomlib/circuits/poseidon.circom";

template Hide() {
    signal input _msgSender;
    signal input answer;
    signal input nonce;
    signal output hash;
    
    component hasher = Poseidon(2);
    hasher.inputs[0] <== answer;
    hasher.inputs[1] <== nonce;
    hash <== hasher.out;
}

component main { public [ _msgSender, nonce ] } = Hide();