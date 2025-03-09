pragma circom 2.1.6;

include "circomlib/circuits/poseidon.circom";

template Hide() {
    signal input _msgSender;
    signal input answer;
    signal output hash;
    
    component hasher = Poseidon(1);
    hasher.inputs[0] <== answer;
    hash <== hasher.out;
}

component main { public [ _msgSender ] } = Hide();