type TakeawayProps = {
  title: string;
  text: string;
};

const Takeaway = ({ title, text }: TakeawayProps) => (
  <section className="takeaway-banner">
    <p className="takeaway-banner__label">{title}</p>
    <p className="takeaway-banner__text">{text}</p>
  </section>
);

export default Takeaway;
